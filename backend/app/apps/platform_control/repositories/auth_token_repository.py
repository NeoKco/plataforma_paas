from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.apps.platform_control.models.auth_token import AuthToken


class AuthTokenRepository:
    def get_by_jti(self, db: Session, jti: str) -> AuthToken | None:
        return db.query(AuthToken).filter(AuthToken.jti == jti).first()

    def save(self, db: Session, auth_token: AuthToken) -> AuthToken:
        db.add(auth_token)
        db.commit()
        db.refresh(auth_token)
        return auth_token

    def revoke(self, db: Session, auth_token: AuthToken, replaced_by_jti: str | None = None) -> AuthToken:
        auth_token.revoked_at = datetime.now(timezone.utc)
        auth_token.replaced_by_jti = replaced_by_jti
        db.add(auth_token)
        db.commit()
        db.refresh(auth_token)
        return auth_token

    def revoke_active_refresh_tokens(
        self,
        db: Session,
        *,
        subject_scope: str,
        subject_user_id: int,
        tenant_slug: str | None = None,
    ) -> int:
        query = db.query(AuthToken).filter(
            AuthToken.subject_scope == subject_scope,
            AuthToken.subject_user_id == subject_user_id,
            AuthToken.token_type == "refresh",
            AuthToken.revoked_at.is_(None),
        )

        if tenant_slug is None:
            query = query.filter(AuthToken.tenant_slug.is_(None))
        else:
            query = query.filter(AuthToken.tenant_slug == tenant_slug)

        tokens = query.all()
        now = datetime.now(timezone.utc)
        for token in tokens:
            token.revoked_at = now
            db.add(token)

        db.commit()
        return len(tokens)
