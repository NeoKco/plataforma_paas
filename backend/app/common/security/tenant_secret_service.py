import os
from pathlib import Path

from app.common.config.settings import BASE_DIR


class TenantSecretService:
    def build_tenant_db_password_env_var_name(self, tenant_slug: str) -> str:
        normalized_slug = tenant_slug.upper().replace("-", "_")
        return f"TENANT_DB_PASSWORD__{normalized_slug}"

    def resolve_tenant_db_password(self, tenant_slug: str, current_settings) -> str:
        normalized_slug = tenant_slug.upper().replace("-", "_")
        env_path = Path(getattr(current_settings, "BASE_DIR", BASE_DIR)) / ".env"
        candidates = [
            self.build_tenant_db_password_env_var_name(tenant_slug),
            f"TENANT_BOOTSTRAP_DB_PASSWORD_{normalized_slug}",
        ]

        for env_var in candidates:
            env_file_value = self._read_env_var_from_file(env_path, env_var)
            if env_file_value:
                return env_file_value

            env_value = os.getenv(env_var)
            if env_value:
                return env_value

            setting_value = getattr(current_settings, env_var, None)
            if setting_value:
                return setting_value

        raise ValueError("Tenant DB password not configured for this tenant")

    def store_tenant_db_password(
        self,
        tenant_slug: str,
        password: str,
        env_path: Path,
    ) -> str:
        env_var = self.build_tenant_db_password_env_var_name(tenant_slug)
        os.environ[env_var] = password
        self._upsert_env_var(env_path, env_var, password)
        return env_var

    def clear_tenant_bootstrap_db_password(
        self,
        tenant_slug: str,
        env_path: Path,
    ) -> None:
        bootstrap_var = f"TENANT_BOOTSTRAP_DB_PASSWORD_{tenant_slug.upper().replace('-', '_')}"
        os.environ.pop(bootstrap_var, None)
        self._remove_env_var(env_path, bootstrap_var)

    def mask_secret(self, value: str, visible: int = 4) -> str:
        if len(value) <= visible:
            return "*" * len(value)

        hidden_length = len(value) - visible
        return ("*" * hidden_length) + value[-visible:]

    def _upsert_env_var(self, env_path: Path, env_var: str, value: str) -> None:
        existing_lines: list[str] = []
        if env_path.exists():
            existing_lines = env_path.read_text(encoding="utf-8").splitlines()

        new_line = f"{env_var}={value}"
        updated_lines: list[str] = []
        found = False

        for line in existing_lines:
            if line.startswith(f"{env_var}="):
                updated_lines.append(new_line)
                found = True
            else:
                updated_lines.append(line)

        if not found:
            updated_lines.append(new_line)

        env_path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")

    def _read_env_var_from_file(self, env_path: Path, env_var: str) -> str | None:
        if not env_path.exists():
            return None

        for line in env_path.read_text(encoding="utf-8").splitlines():
            if not line or line.lstrip().startswith("#"):
                continue
            if line.startswith(f"{env_var}="):
                return line.split("=", 1)[1].strip()

        return None

    def _remove_env_var(self, env_path: Path, env_var: str) -> None:
        if not env_path.exists():
            return

        updated_lines = [
            line
            for line in env_path.read_text(encoding="utf-8").splitlines()
            if not line.startswith(f"{env_var}=")
        ]
        env_path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")
