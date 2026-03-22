from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

import jwt
from fastapi import HTTPException, status

from app.common.config.settings import settings


def _build_token_payload(
    *,
    data: Dict[str, Any],
    issuer: str,
    audience: str,
    expire_minutes: int,
    token_type: str,
    expires_delta: Optional[timedelta] = None,
) -> Dict[str, Any]:
    payload = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=expire_minutes))

    payload.update(
        {
            "jti": str(uuid4()),
            "iss": issuer,
            "aud": audience,
            "token_type": token_type,
            "iat": now,
            "nbf": now,
            "exp": expire,
        }
    )

    return payload


def _decode_token(
    *,
    token: str,
    secret_key: str,
    algorithm: str,
    issuer: str,
    audience: str,
) -> Dict[str, Any]:
    try:
        return jwt.decode(
            token,
            secret_key,
            algorithms=[algorithm],
            issuer=issuer,
            audience=audience,
            options={
                "require": [
                    "sub",
                    "email",
                    "role",
                    "token_scope",
                    "jti",
                    "iss",
                    "aud",
                    "iat",
                    "nbf",
                    "exp",
                ]
            },
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    audience: Optional[str] = None,
) -> str:
    payload = _build_token_payload(
        data=data,
        issuer=settings.JWT_ISSUER,
        audience=audience or settings.JWT_PLATFORM_AUDIENCE,
        expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        token_type="access",
        expires_delta=expires_delta,
    )

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str, audience: Optional[str] = None) -> Dict[str, Any]:
    return _decode_token(
        token=token,
        secret_key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
        issuer=settings.JWT_ISSUER,
        audience=audience or settings.JWT_PLATFORM_AUDIENCE,
    )


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    audience: Optional[str] = None,
) -> str:
    payload = _build_token_payload(
        data=data,
        issuer=settings.JWT_ISSUER,
        audience=audience or settings.JWT_PLATFORM_AUDIENCE,
        expire_minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES,
        token_type="refresh",
        expires_delta=expires_delta,
    )

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


class JWTService:
    def __init__(
        self,
        secret_key: str,
        algorithm: str = "HS256",
        expire_minutes: int = 60,
        issuer: str = "platform_paas",
    ):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.expire_minutes = expire_minutes
        self.issuer = issuer

    def create_access_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
        audience: str = "platform-api",
    ) -> str:
        payload = _build_token_payload(
            data=data,
            issuer=self.issuer,
            audience=audience,
            expire_minutes=self.expire_minutes,
            token_type="access",
            expires_delta=expires_delta,
        )

        return jwt.encode(
            payload,
            self.secret_key,
            algorithm=self.algorithm,
        )

    def create_refresh_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
        audience: str = "platform-api",
        refresh_expire_minutes: int | None = None,
    ) -> str:
        payload = _build_token_payload(
            data=data,
            issuer=self.issuer,
            audience=audience,
            expire_minutes=refresh_expire_minutes or settings.REFRESH_TOKEN_EXPIRE_MINUTES,
            token_type="refresh",
            expires_delta=expires_delta,
        )

        return jwt.encode(
            payload,
            self.secret_key,
            algorithm=self.algorithm,
        )

    def decode_token(self, token: str, audience: str = "platform-api") -> Dict[str, Any]:
        return _decode_token(
            token=token,
            secret_key=self.secret_key,
            algorithm=self.algorithm,
            issuer=self.issuer,
            audience=audience,
        )
