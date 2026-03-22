from pathlib import Path

from app.common.config.settings import settings


def is_platform_installed() -> bool:
    install_flag = Path(settings.INSTALL_FLAG_FILE)
    return install_flag.exists()