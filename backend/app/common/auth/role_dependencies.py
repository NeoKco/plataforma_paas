from fastapi import Depends, HTTPException

from app.common.auth.dependencies import get_current_token_payload


def require_role(*allowed_roles: str):
    def role_checker(payload: dict = Depends(get_current_token_payload)) -> dict:
        user_role = payload.get("role")

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action",
            )

        return payload

    return role_checker