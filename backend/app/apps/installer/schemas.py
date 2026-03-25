from pydantic import BaseModel, Field


class InstallRequest(BaseModel):
    admin_db_host: str = Field(default="127.0.0.1")
    admin_db_port: int = Field(default=5432)
    admin_db_name: str = Field(default="postgres")
    admin_db_user: str
    admin_db_password: str

    control_db_name: str = Field(default="platform_control")
    control_db_user: str = Field(default="platform_owner")
    control_db_password: str

    app_name: str = Field(default="Platform Backend")
    app_version: str = Field(default="0.1.0")

    initial_superadmin_full_name: str
    initial_superadmin_email: str
    initial_superadmin_password: str


class InstallResponse(BaseModel):
    success: bool
    message: str
    initial_superadmin_email: str | None = None
    recovery_key: str | None = None
