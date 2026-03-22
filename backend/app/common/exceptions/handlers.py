from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        return _build_error_response(
            request=request,
            status_code=exc.status_code,
            detail=exc.detail,
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return _build_error_response(
            request=request,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request validation failed",
            errors=exc.errors(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        return _build_error_response(
            request=request,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
            error_type=type(exc).__name__,
        )


def _build_error_response(
    *,
    request: Request,
    status_code: int,
    detail,
    errors: list[dict] | None = None,
    error_type: str | None = None,
) -> JSONResponse:
    payload = {
        "success": False,
        "detail": detail,
        "request_id": getattr(request.state, "request_id", None),
    }

    if errors:
        payload["errors"] = errors

    if error_type:
        payload["error_type"] = error_type

    return JSONResponse(
        status_code=status_code,
        content=payload,
    )
