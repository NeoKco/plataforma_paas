import json
import urllib.request

from app.common.auth.auth_token_service import AuthTokenService
from app.common.config.settings import settings
from app.common.db.control_database import ControlSessionLocal


def main() -> None:
    db = ControlSessionLocal()
    try:
        token = AuthTokenService().issue_token_pair(
            db,
            user_id=1,
            email="ieris.ltda@gmail.com",
            role="admin",
            token_scope="tenant",
            audience=settings.JWT_TENANT_AUDIENCE,
            tenant_slug="ieris-ltda",
        )["access_token"]
    finally:
        db.close()

    request = urllib.request.Request(
        "https://orkestia.ddns.net/tenant/maintenance/work-orders",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(request) as response:
        payload = json.load(response)
    print(json.dumps(payload["data"], ensure_ascii=False))


if __name__ == "__main__":
    main()
