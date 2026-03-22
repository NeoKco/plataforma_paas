from app.apps.platform_control.models.platform_user import PlatformUser
from app.common.db.control_database import ControlSessionLocal
from app.common.security.password_service import hash_password


def main() -> None:
    db = ControlSessionLocal()
    try:
        existing = db.query(PlatformUser).filter(
            PlatformUser.email == "support@platform.dev"
        ).first()

        if existing:
            print("Support user already exists.")
            return

        user = PlatformUser(
            full_name="Support User",
            email="support@platform.dev",
            password_hash=hash_password("Support123!"),
            role="support",
            is_active=True,
        )

        db.add(user)
        db.commit()
        print("Support user created successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()