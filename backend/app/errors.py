"""Structured errors and request-id tracing.

Every error leaves the API in one shape (blueprint 4.4 / 5.2):

    {
      "code": "not_found",
      "message": "Submission not found",
      "details": {...},
      "request_id": "9f2c...",
      "detail": "Submission not found"     <- kept for existing clients
    }
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
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
    return {
        "code": code,
        "message": message,
        "detail": message,
        "details": details,
        "request_id": request_id,
    }


def format_error_response(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    request_id: str = "",
) -> JSONResponse:
    content = error_body(code, message, details=details, request_id=request_id)
    return JSONResponse(status_code=status_code, content=content)


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Any = None
    request_id: str = ""


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


class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Any = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


class StaleVersionException(AppException):
    def __init__(self, message: str = "Stale version: submission has been updated by another reviewer"):
        super().__init__(
            code="STALE_VERSION",
            message=message,
            status_code=409,
        )


class NotFoundException(AppException):
    def __init__(self, resource: str, resource_id: str = ""):
        msg = f"{resource} {resource_id} not found" if resource_id else f"{resource} not found"
        super().__init__(
            code="NOT_FOUND",
            message=msg,
            status_code=404,
        )


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=403,
        )


class UnauthenticatedException(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            code="UNAUTHENTICATED",
            message=message,
            status_code=401,
        )


class ValidationException(AppException):
    def __init__(self, message: str = "Validation error", details: Any = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=422,
            details=details,
        )


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
        except Exception:  # pragma: no cover
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
    async def _app_error(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(
                exc.code,
                exc.message,
                details=exc.details,
                request_id=_request_id(request),
            ),
        )

    @app.exception_handler(AppException)
    async def _app_exception(request: Request, exc: AppException):
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
    async def _http_error(request: Request, exc: HTTPException):
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
    async def _validation_error(request: Request, exc: RequestValidationError):
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
    async def _unhandled(request: Request, exc: Exception):
        log.exception("unhandled error rid=%s", _request_id(request))
        return JSONResponse(
            status_code=500,
            content=error_body(
                "internal_error",
                "Something went wrong on our side. Please retry.",
                request_id=_request_id(request),
            ),
        )
