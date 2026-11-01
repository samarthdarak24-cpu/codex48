"""Canonical error handling and standardized error envelope.

Error shape specified in PRECEDENT_MASTER_BACKEND_PROMPT.md §4.1:
{
  "code": "NOT_FOUND",
  "message": "Resource not found",
  "details": {...},
  "request_id": "req-uuid"
}
"""
from typing import Any
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Any = None
    request_id: str = ""


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


def format_error_response(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    request_id: str = "",
) -> JSONResponse:
    content = {
        "code": code,
        "message": message,
        "details": details,
        "request_id": request_id,
        # Backward compatibility field for older fetch clients checking data.detail
        "detail": message,
    }
    return JSONResponse(status_code=status_code, content=content)

