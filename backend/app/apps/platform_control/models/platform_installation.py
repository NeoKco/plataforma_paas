from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db.base import Base


class PlatformInstallation(Base):
    __tablename__ = "platform_installation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    app_name: Mapped[str] = mapped_column(String(150), nullable=False)
    app_version: Mapped[str] = mapped_column(String(50), nullable=False)
    installed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    installed_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )