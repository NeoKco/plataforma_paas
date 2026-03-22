from pathlib import Path

from app.apps.installer.schemas import InstallRequest
from app.apps.installer.services.postgres_bootstrap_service import (
    PostgresBootstrapService,
)
from app.common.config.settings import settings


class InstallerService:
    def run_installation(self, payload: InstallRequest) -> None:
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

        self._write_env_file(payload)
        self._write_install_flag()

    def _write_install_flag(self) -> None:
        install_flag = Path(settings.INSTALL_FLAG_FILE)
        install_flag.write_text("installed=true\n", encoding="utf-8")

    def _write_env_file(self, payload: InstallRequest) -> None:
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
        )

        env_path.write_text(env_content, encoding="utf-8")