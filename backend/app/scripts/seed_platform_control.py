from sqlalchemy.orm import Session

from app.apps.platform_control.models.platform_installation import PlatformInstallation
from app.apps.platform_control.models.platform_user import PlatformUser
from app.common.config.settings import settings
from app.common.db.control_database import ControlSessionLocal
from app.common.security.password_service import hash_password


SUPERADMIN_NAME = "Felipe Hormazabal"
SUPERADMIN_EMAIL = "admin@platform.local"
SUPERADMIN_PASSWORD = "AdminTemporal123!"


def seed_installation(db: Session) -> None:
    existing = db.query(PlatformInstallation).first()
    if existing:
        return

    installation = PlatformInstallation(
        app_name=settings.APP_NAME,
        app_version=settings.APP_VERSION,
        installed=True,
    )
    db.add(installation)
    db.commit()


def seed_superadmin(db: Session) -> None:
    existing = db.query(PlatformUser).filter(
        PlatformUser.email == SUPERADMIN_EMAIL
    ).first()
    if existing:
        existing.full_name = SUPERADMIN_NAME
        existing.password_hash = hash_password(SUPERADMIN_PASSWORD)
        existing.role = "superadmin"
        existing.is_active = True
        db.commit()
        return

    user = PlatformUser(
        full_name=SUPERADMIN_NAME,
        email=SUPERADMIN_EMAIL,
        password_hash=hash_password(SUPERADMIN_PASSWORD),
        role="superadmin",
        is_active=True,
    )
    db.add(user)
    db.commit()


def main() -> None:
    db = ControlSessionLocal()
    try:
        seed_installation(db)
        seed_superadmin(db)
        print("Platform control seed completed successfully.")
        print(f"Superadmin email: {SUPERADMIN_EMAIL}")
        print(f"Superadmin password: {SUPERADMIN_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
