"""Structured errors and request-id tracing.

Every error leaves the API in one shape (blueprint 4.4 / 5.2):

    {
      "code": "not_found",
      "message": "Submission not found",
      "details": {...},
      "request_id": "9f2c...",
      "detail": "Submission not found"     <- kept for existing clients
    }

`detail` mirrors `message` so the typed frontend client (which reads
``detail``/``message``) keeps working unchanged.

The request id is generated (or propagated from an inbound ``X-Request-ID``)
by :class:`RequestIDMiddleware` and echoed on the response header so a judge
can match a UI error to a server log line.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("precedent.errors")

REQUEST_ID_HEADER = "X-Request-ID"


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "") or uuid.uuid4().hex


def error_body(
    code: str,
    message: str,
    *,
    details: Optional[Any] = None,
    request_id: str = "",
) -> dict:
    body: dict[str, Any] = {
        "code": code,
        "message": message,
        "detail": message,
        "details": details,
        "request_id": request_id,
    }
    return body


class AppError(Exception):
    """Raise for a handled, user-facing failure."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        code: str = "bad_request",
        details: Optional[Any] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


_STATUS_CODES = {
    400: "bad_request",
    401: "unauthenticated",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    422: "validation_error",
    429: "rate_limited",
    500: "internal_error",
    503: "service_unavailable",
}


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a request id to every request and log safe metadata."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        incoming = request.headers.get(REQUEST_ID_HEADER)
        rid = (incoming or uuid.uuid4().hex)[:64]
        request.state.request_id = rid
        try:
            response = await call_next(request)
        except Exception:  # pragma: no cover - re-raised by the handler below
            log.exception("unhandled error rid=%s path=%s", rid, request.url.path)
            raise
        response.headers[REQUEST_ID_HEADER] = rid
        if response.status_code >= 500:
            log.error(
                "server error rid=%s method=%s path=%s status=%s",
                rid,
                request.method,
                request.url.path,
                response.status_code,
            )
        return response


def install_error_handlers(app: FastAPI) -> None:
    """Register handlers so every error uses the structured shape."""

    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):  # noqa: ANN202
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(
                exc.code,
                exc.message,
                details=exc.details,
                request_id=_request_id(request),
            ),
        )

    @app.exception_handler(HTTPException)
    async def _http_error(request: Request, exc: HTTPException):  # noqa: ANN202
        message = exc.detail if isinstance(exc.detail, str) else "Request failed"
        details = None if isinstance(exc.detail, str) else exc.detail
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(
                _STATUS_CODES.get(exc.status_code, "error"),
                message,
                details=details,
                request_id=_request_id(request),
            ),
            headers=getattr(exc, "headers", None) or None,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):  # noqa: ANN202
        fields = [
            {
                "field": ".".join(str(p) for p in err.get("loc", []) if p != "body"),
                "message": err.get("msg", "Invalid value"),
                "type": err.get("type", ""),
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=error_body(
                "validation_error",
                "Some fields need attention.",
                details={"fields": fields},
                request_id=_request_id(request),
            ),
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):  # noqa: ANN202
        # Never leak a stack trace or a filesystem path to the client.
        log.exception("unhandled error rid=%s", _request_id(request))
        return JSONResponse(
            status_code=500,
            content=error_body(
                "internal_error",
                "Something went wrong on our side. Please retry.",
                request_id=_request_id(request),
            ),
        )
