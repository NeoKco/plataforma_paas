from pathlib import Path
from secrets import token_urlsafe

from sqlalchemy.engine import URL
from sqlalchemy.orm import Session, sessionmaker

from app.apps.installer.schemas import InstallRequest
from app.apps.installer.services.postgres_bootstrap_service import (
    PostgresBootstrapService,
)
import app.apps.platform_control.models  # noqa: F401
from app.apps.platform_control.models.platform_installation import PlatformInstallation
from app.apps.platform_control.services.platform_root_account_service import (
    PlatformRootAccountService,
)
from app.common.config.settings import settings
from app.common.db.base import Base
from app.common.db.engine_factory import create_postgres_engine
from app.common.security.password_service import hash_password


class InstallerService:
    def __init__(self) -> None:
        self.platform_root_account_service = PlatformRootAccountService()

    def run_installation(self, payload: InstallRequest) -> dict[str, str]:
        bootstrap = PostgresBootstrapService(
            admin_host=payload.admin_db_host,
            admin_port=payload.admin_db_port,
            admin_db_name=payload.admin_db_name,
            admin_user=payload.admin_db_user,
            admin_password=payload.admin_db_password,
        )

        bootstrap.bootstrap_control_database(
            control_db_name=payload.control_db_name,
            control_db_user=payload.control_db_user,
            control_db_password=payload.control_db_password,
        )

        recovery_key = token_urlsafe(24)
        recovery_key_hash = hash_password(recovery_key)

        control_db = self._build_control_session(payload)
        try:
            self._bootstrap_platform_state(control_db, payload)
        finally:
            control_db.close()

        self._write_env_file(payload, recovery_key_hash=recovery_key_hash)
        self._write_install_flag()
        return {
            "initial_superadmin_email": payload.initial_superadmin_email.strip().lower(),
            "recovery_key": recovery_key,
        }

    def _build_control_session(self, payload: InstallRequest) -> Session:
        engine = create_postgres_engine(
            URL.create(
                drivername="postgresql+psycopg2",
                username=payload.control_db_user,
                password=payload.control_db_password,
                host=payload.admin_db_host,
                port=payload.admin_db_port,
                database=payload.control_db_name,
            ),
            pool_size=1,
            max_overflow=0,
            pool_timeout_seconds=30,
            pool_recycle_seconds=1800,
        )
        Base.metadata.create_all(bind=engine)
        session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return session_factory()

    def _bootstrap_platform_state(
        self,
        db: Session,
        payload: InstallRequest,
    ) -> None:
        installation = db.query(PlatformInstallation).first()
        if installation is None:
            installation = PlatformInstallation(
                app_name=payload.app_name.strip(),
                app_version=payload.app_version.strip(),
                installed=True,
            )
            db.add(installation)
            db.commit()
        else:
            installation.app_name = payload.app_name.strip()
            installation.app_version = payload.app_version.strip()
            installation.installed = True
            db.commit()

        self.platform_root_account_service.bootstrap_initial_superadmin(
            db,
            full_name=payload.initial_superadmin_full_name,
            email=payload.initial_superadmin_email,
            password=payload.initial_superadmin_password,
        )

    def _write_install_flag(self) -> None:
        install_flag = Path(settings.INSTALL_FLAG_FILE)
        install_flag.write_text("installed=true\n", encoding="utf-8")

    def _write_env_file(
        self,
        payload: InstallRequest,
        *,
        recovery_key_hash: str,
    ) -> None:
        env_path = Path(settings.BASE_DIR) / ".env"

        env_content = (
            f"APP_NAME={payload.app_name}\n"
            f"APP_VERSION={payload.app_version}\n"
            f"APP_ENV=development\n"
            f"DEBUG=true\n"
            f"PLATFORM_INSTALLED=true\n"
            f"INSTALL_FLAG_FILE={settings.INSTALL_FLAG_FILE}\n"
            f"CONTROL_DB_HOST={payload.admin_db_host}\n"
            f"CONTROL_DB_PORT={payload.admin_db_port}\n"
            f"CONTROL_DB_NAME={payload.control_db_name}\n"
            f"CONTROL_DB_USER={payload.control_db_user}\n"
            f"CONTROL_DB_PASSWORD={payload.control_db_password}\n"
            f"PLATFORM_ROOT_RECOVERY_KEY_HASH={recovery_key_hash}\n"
        )

        env_path.write_text(env_content, encoding="utf-8")
