from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.apps.platform_control.models.auth_token import AuthToken
from app.apps.platform_control.repositories.auth_token_repository import (
    AuthTokenRepository,
)
from app.common.auth.jwt_service import JWTService
from app.common.config.settings import settings


class AuthTokenService:
    def __init__(
        self,
        auth_token_repository: AuthTokenRepository | None = None,
        jwt_service: JWTService | None = None,
    ):
        self.auth_token_repository = auth_token_repository or AuthTokenRepository()
        self.jwt_service = jwt_service or JWTService(
            secret_key=settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
            expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            issuer=settings.JWT_ISSUER,
        )

    def issue_token_pair(
        self,
        db: Session,
        *,
        user_id: int,
        email: str,
        role: str,
        token_scope: str,
        audience: str,
        tenant_slug: str | None = None,
    ) -> dict[str, str]:
        claims = {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "token_scope": token_scope,
        }
        if tenant_slug:
            claims["tenant_slug"] = tenant_slug

        access_token = self.jwt_service.create_access_token(
            data=claims,
            audience=audience,
        )
        refresh_token = self.jwt_service.create_refresh_token(
            data=claims,
            audience=audience,
        )
        refresh_payload = self.jwt_service.decode_token(
            refresh_token,
            audience=audience,
        )

        self.auth_token_repository.save(
            db,
            AuthToken(
                jti=refresh_payload["jti"],
                subject_scope=token_scope,
                subject_user_id=user_id,
                tenant_slug=tenant_slug,
                token_type="refresh",
                audience=audience,
                issued_at=self._timestamp_to_datetime(refresh_payload["iat"]),
                expires_at=self._timestamp_to_datetime(refresh_payload["exp"]),
                revoked_at=None,
                replaced_by_jti=None,
            ),
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    def refresh_token_pair(
        self,
        db: Session,
        *,
        refresh_token: str,
        expected_scope: str,
        audience: str,
    ) -> tuple[dict, dict[str, str]]:
        payload = self.jwt_service.decode_token(refresh_token, audience=audience)

        if payload.get("token_type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="El token no corresponde a un refresh token",
            )

        if payload.get("token_scope") != expected_scope:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El refresh token no corresponde al scope esperado",
            )

        stored_token = self.auth_token_repository.get_by_jti(db, payload["jti"])
        if not stored_token or stored_token.token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token no reconocido",
            )

        if stored_token.revoked_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token revocado",
            )

        token_pair = self.issue_token_pair(
            db,
            user_id=int(payload["sub"]),
            email=payload["email"],
            role=payload["role"],
            token_scope=payload["token_scope"],
            audience=audience,
            tenant_slug=payload.get("tenant_slug"),
        )

        rotated_refresh_payload = self.jwt_service.decode_token(
            token_pair["refresh_token"],
            audience=audience,
        )
        self.auth_token_repository.revoke(
            db,
            stored_token,
            replaced_by_jti=rotated_refresh_payload["jti"],
        )

        return payload, token_pair

    def revoke_session(
        self,
        db: Session,
        *,
        access_payload: dict,
    ) -> int:
        access_jti = access_payload["jti"]
        existing_token = self.auth_token_repository.get_by_jti(db, access_jti)
        if existing_token is None:
            existing_token = AuthToken(
                jti=access_jti,
                subject_scope=access_payload["token_scope"],
                subject_user_id=int(access_payload["sub"]),
                tenant_slug=access_payload.get("tenant_slug"),
                token_type="access",
                audience=str(access_payload["aud"]),
                issued_at=self._timestamp_to_datetime(access_payload["iat"]),
                expires_at=self._timestamp_to_datetime(access_payload["exp"]),
                revoked_at=datetime.now(timezone.utc),
                replaced_by_jti=None,
            )
            self.auth_token_repository.save(db, existing_token)
        elif existing_token.revoked_at is None:
            self.auth_token_repository.revoke(db, existing_token)

        revoked_refresh_count = self.auth_token_repository.revoke_active_refresh_tokens(
            db,
            subject_scope=access_payload["token_scope"],
            subject_user_id=int(access_payload["sub"]),
            tenant_slug=access_payload.get("tenant_slug"),
        )
        return revoked_refresh_count

    def is_token_revoked(self, db: Session, *, jti: str) -> bool:
        stored_token = self.auth_token_repository.get_by_jti(db, jti)
        return bool(stored_token and stored_token.revoked_at is not None)

    def _timestamp_to_datetime(self, value: int | float | datetime) -> datetime:
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc)
        return datetime.fromtimestamp(value, tz=timezone.utc)
