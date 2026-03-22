from time import perf_counter
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.common.observability.logging_service import LoggingService


class RequestObservabilityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, logging_service: LoggingService | None = None):
        super().__init__(app)
        self.logging_service = logging_service or LoggingService()

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request.state.request_id = request_id
        started_at = perf_counter()

        try:
            response = await call_next(request)
        except Exception as exc:
            self.logging_service.log_request_exception(
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                error_type=type(exc).__name__,
            )
            raise

        duration_ms = int((perf_counter() - started_at) * 1000)
        response.headers["X-Request-ID"] = request_id
        self.logging_service.log_request_summary(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            token_scope=getattr(request.state, "token_scope", None),
            platform_user_id=getattr(request.state, "platform_user_id", None),
            tenant_user_id=getattr(request.state, "tenant_user_id", None),
            tenant_slug=getattr(request.state, "tenant_slug", None),
        )
        return response
