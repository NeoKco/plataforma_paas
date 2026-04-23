from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.apps.platform_control.services.auth_audit_service import AuthAuditService
from app.common.db.control_database import ControlSessionLocal

auth_audit_service = AuthAuditService()


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        _log_relevant_http_exception(
            request=request,
            status_code=exc.status_code,
            detail=exc.detail,
        )
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


def _log_relevant_http_exception(
    *,
    request: Request,
    status_code: int,
    detail,
) -> None:
    path = request.url.path

    if status_code not in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN):
        return
    if not (path.startswith("/platform") or path.startswith("/tenant")):
        return
    if path.startswith("/platform/auth") or path.startswith("/tenant/auth"):
        return

    subject_scope = getattr(request.state, "token_scope", None)
    if subject_scope not in ("platform", "tenant"):
        if path.startswith("/platform"):
            subject_scope = "platform"
        elif path.startswith("/tenant"):
            subject_scope = "tenant"

    if subject_scope not in ("platform", "tenant"):
        return

    event_type = (
        f"{subject_scope}.request.denied"
        if status_code == status.HTTP_403_FORBIDDEN
        else f"{subject_scope}.request.rejected"
    )
    outcome = "denied" if status_code == status.HTTP_403_FORBIDDEN else "failed"
    subject_user_id = getattr(request.state, "platform_user_id", None)
    if subject_scope == "tenant":
        subject_user_id = getattr(request.state, "tenant_user_id", None)
    email = getattr(request.state, "platform_email", None)
    if subject_scope == "tenant":
        email = getattr(request.state, "tenant_email", None)

    db = ControlSessionLocal()
    try:
        auth_audit_service.log_event(
            db,
            event_type=event_type,
            subject_scope=subject_scope,
            outcome=outcome,
            subject_user_id=subject_user_id,
            tenant_slug=getattr(request.state, "tenant_slug", None),
            email=email,
            token_jti=(getattr(request.state, "jwt_payload", None) or {}).get("jti"),
            request_id=getattr(request.state, "request_id", None),
            request_path=path,
            request_method=request.method,
            detail=str(detail),
        )
    except Exception:
        pass
    finally:
        db.close()
