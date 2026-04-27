from pathlib import Path
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.common.db.url_factory import build_postgres_url


BASE_DIR = Path(__file__).resolve().parents[4]
DEFAULT_DEVELOPMENT_CORS_ORIGINS = (
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://192.168.7.42:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://192.168.7.42:4173",
)


class Settings(BaseSettings):
    BASE_DIR: Path = BASE_DIR

    APP_NAME: str = "Platform Backend"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    APP_ENV: str = "development"
    PLATFORM_INSTALLED: bool = False
    BACKEND_CORS_ALLOW_ORIGINS: str = ""

    INSTALL_FLAG_FILE: str = str(BASE_DIR / ".platform_installed")
    TENANT_SECRETS_FILE: str = str(BASE_DIR / ".tenant-secrets.env")
    AI_RUNTIME_SECRETS_FILE: str = str(BASE_DIR / ".runtime-ai-secrets.env")

    CONTROL_DB_HOST: str = "127.0.0.1"
    CONTROL_DB_PORT: int = 5432
    CONTROL_DB_NAME: str = "platform_control"
    CONTROL_DB_USER: str = "platform_owner"
    CONTROL_DB_PASSWORD: str = "change_me"
    CONTROL_DB_POOL_SIZE: int = 5
    CONTROL_DB_MAX_OVERFLOW: int = 10
    CONTROL_DB_POOL_TIMEOUT_SECONDS: int = 30
    CONTROL_DB_POOL_RECYCLE_SECONDS: int = 1800

    POSTGRES_ADMIN_PASSWORD: str = ""
    PLATFORM_ROOT_RECOVERY_KEY_HASH: str = ""

    JWT_SECRET_KEY: str = "change_this_secret_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "platform_paas"
    JWT_PLATFORM_AUDIENCE: str = "platform-api"
    JWT_TENANT_AUDIENCE: str = "tenant-api"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 480
    TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP: str = ""
    TENANT_BOOTSTRAP_DB_PASSWORD_CONDOMINIO_DEMO: str = ""
    TENANT_DB_POOL_SIZE: int = 3
    TENANT_DB_MAX_OVERFLOW: int = 5
    TENANT_DB_POOL_TIMEOUT_SECONDS: int = 30
    TENANT_DB_POOL_RECYCLE_SECONDS: int = 1800
    REDIS_URL: str = ""
    TENANT_API_READ_REQUESTS_PER_MINUTE: int = 0
    TENANT_API_WRITE_REQUESTS_PER_MINUTE: int = 0
    TENANT_PLAN_RATE_LIMITS: str = (
        "mensual=120:40;"
        "trimestral=180:60;"
        "semestral=240:80;"
        "anual=360:120"
    )
    TENANT_PLAN_ENABLED_MODULES: str = (
        "mensual=core,users;"
        "trimestral=core,users,maintenance;"
        "semestral=core,users,finance;"
        "anual=all"
    )
    TENANT_PLAN_MODULE_LIMITS: str = (
        "mensual=core.users:10,core.users.active:8,core.users.monthly:5,"
        "core.users.admin:1,core.users.manager:2,core.users.operator:7,"
        "finance.entries:250,finance.entries.monthly:120,"
        "finance.entries.monthly.income:80,finance.entries.monthly.expense:80;"
        "trimestral=core.users:20,core.users.active:16,core.users.monthly:10,"
        "core.users.admin:2,core.users.manager:4,core.users.operator:14,"
        "finance.entries:600,finance.entries.monthly:240,"
        "finance.entries.monthly.income:160,finance.entries.monthly.expense:160;"
        "semestral=core.users:35,core.users.active:28,core.users.monthly:16,"
        "core.users.admin:3,core.users.manager:6,core.users.operator:26,"
        "finance.entries:1200,finance.entries.monthly:420,"
        "finance.entries.monthly.income:280,finance.entries.monthly.expense:280;"
        "anual=core.users:60,core.users.active:48,core.users.monthly:24,"
        "core.users.admin:5,core.users.manager:10,core.users.operator:45,"
        "finance.entries:2400,finance.entries.monthly:800,"
        "finance.entries.monthly.income:500,finance.entries.monthly.expense:500"
    )
    TENANT_BILLING_GRACE_RATE_LIMITS: str = ""
    TENANT_BILLING_GRACE_ENABLED_MODULES: str = ""
    TENANT_BILLING_GRACE_MODULE_LIMITS: str = ""
    BILLING_STRIPE_WEBHOOK_SECRET: str = ""
    BILLING_STRIPE_WEBHOOK_TOLERANCE_SECONDS: int = 300
    BILLING_ALERT_DUPLICATE_EVENTS_THRESHOLD: int = 0
    BILLING_ALERT_IGNORED_EVENTS_THRESHOLD: int = 0
    BILLING_ALERT_PROVIDER_EVENTS_THRESHOLD: int = 0
    TENANT_API_RATE_LIMIT_BACKEND: str = "memory"
    TENANT_API_RATE_LIMIT_REDIS_URL: str = ""
    TENANT_API_RATE_LIMIT_KEY_PREFIX: str = "platform_paas:tenant_rate_limit"

    WORKER_POLL_INTERVAL_SECONDS: int = 30
    WORKER_MAX_JOBS_PER_CYCLE: int = 10
    WORKER_MAX_FAILURES_PER_CYCLE: int = 3
    WORKER_RETRY_BASE_SECONDS: int = 30
    WORKER_MAX_RETRY_SECONDS: int = 900
    WORKER_SELECTION_BUFFER_MULTIPLIER: int = 5
    WORKER_BACKLOG_AGING_THRESHOLD_MINUTES: int = 0
    WORKER_JOB_TYPES: str = ""
    WORKER_PROFILES: str = ""
    WORKER_JOB_TYPE_PRIORITIES: str = ""
    WORKER_JOB_TYPE_LIMITS: str = ""
    WORKER_JOB_TYPE_BACKLOG_LIMITS: str = ""
    WORKER_TENANT_TYPE_PRIORITIES: str = ""
    WORKER_TENANT_TYPE_LIMITS: str = ""
    WORKER_TENANT_TYPE_BACKLOG_LIMITS: str = ""
    WORKER_LOCK_FILE: str = "/tmp/platform_paas_provisioning_worker.lock"
    PROVISIONING_JOB_MAX_ATTEMPTS: int = 3
    PROVISIONING_DISPATCH_BACKEND: str = "database"
    PROVISIONING_BROKER_URL: str = ""
    PROVISIONING_BROKER_KEY_PREFIX: str = "platform_paas:provisioning_broker"
    PROVISIONING_BROKER_PROCESSING_LEASE_SECONDS: int = 300
    PROVISIONING_BROKER_DLQ_RETENTION_SECONDS: int = 0
    PROVISIONING_ALERT_PENDING_JOBS_THRESHOLD: int = 0
    PROVISIONING_ALERT_RETRY_PENDING_JOBS_THRESHOLD: int = 0
    PROVISIONING_ALERT_FAILED_JOBS_THRESHOLD: int = 0
    PROVISIONING_ALERT_FAILED_ERROR_CODE_THRESHOLD: int = 0
    PROVISIONING_ALERT_FAILED_ERROR_CODE_SCAN_LIMIT: int = 100
    PROVISIONING_ALERT_MAX_ATTEMPTS_SEEN_THRESHOLD: int = 0
    PROVISIONING_ALERT_CYCLE_FAILED_COUNT_THRESHOLD: int = 0
    PROVISIONING_ALERT_CYCLE_DURATION_MS_THRESHOLD: int = 0
    PROVISIONING_ALERT_CYCLE_AGED_JOBS_THRESHOLD: int = 0
    OBSERVABILITY_PROMETHEUS_TEXTFILE_ENABLED: bool = False
    OBSERVABILITY_PROMETHEUS_TEXTFILE_PATH: str = (
        "/tmp/platform_paas_provisioning_metrics.prom"
    )
    FINANCE_ATTACHMENTS_DIR: str = str(
        BASE_DIR / "storage" / "finance_attachments"
    )
    CRM_ATTACHMENTS_DIR: str = str(
        BASE_DIR / "storage" / "crm_attachments"
    )
    TASKOPS_ATTACHMENTS_DIR: str = str(
        BASE_DIR / "storage" / "taskops_attachments"
    )
    TECHDOCS_ATTACHMENTS_DIR: str = str(
        BASE_DIR / "storage" / "techdocs_attachments"
    )
    PRODUCTS_MEDIA_DIR: str = str(
        BASE_DIR / "storage" / "products_media"
    )
    API_IA_URL: str = ""
    MANAGER_API_IA_KEY: str = ""
    API_IA_MODEL_ID: str = ""
    API_IA_MAX_TOKENS: int = 1200
    API_IA_TEMPERATURE: float = 0.1
    API_IA_TIMEOUT: int = 45
    MAINTENANCE_EVIDENCE_DIR: str = str(
        BASE_DIR / "storage" / "maintenance_evidence"
    )
    TENANT_DATA_EXPORT_ARTIFACTS_DIR: str = str(
        BASE_DIR / "storage" / "tenant_data_exports"
    )

    @field_validator("DEBUG", mode="before")
    @classmethod
    def normalize_debug(cls, value: Any) -> Any:
        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            normalized = value.strip().lower()
            truthy = {"1", "true", "yes", "on", "debug", "development", "dev"}
            falsy = {"0", "false", "no", "off", "release", "production", "prod"}

            if normalized in truthy:
                return True
            if normalized in falsy:
                return False

        return value

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def control_database_url(self):
        return build_postgres_url(
            host=self.CONTROL_DB_HOST,
            port=self.CONTROL_DB_PORT,
            database=self.CONTROL_DB_NAME,
            username=self.CONTROL_DB_USER,
            password=self.CONTROL_DB_PASSWORD,
        )

    @property
    def backend_cors_allowed_origins(self) -> list[str]:
        origins = [
            value.strip()
            for value in self.BACKEND_CORS_ALLOW_ORIGINS.split(",")
            if value.strip()
        ]

        if self.APP_ENV.strip().lower() in {"development", "dev"}:
            seen = {value.lower() for value in origins}
            for value in DEFAULT_DEVELOPMENT_CORS_ORIGINS:
                if value.lower() in seen:
                    continue
                origins.append(value)
                seen.add(value.lower())

        return origins


settings = Settings()
