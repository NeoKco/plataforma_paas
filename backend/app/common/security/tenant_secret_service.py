import os
from pathlib import Path

from app.common.config.settings import BASE_DIR


class TenantSecretService:
    def get_runtime_env_path(self, current_settings) -> Path:
        return Path(
            getattr(
                current_settings,
                "TENANT_SECRETS_FILE",
                Path(getattr(current_settings, "BASE_DIR", BASE_DIR))
                / ".tenant-secrets.env",
            )
        )

    def get_legacy_env_path(self, current_settings) -> Path:
        return Path(getattr(current_settings, "BASE_DIR", BASE_DIR)) / ".env"

    def get_candidate_env_paths(self, current_settings) -> list[Path]:
        paths: list[Path] = []
        for path in (
            self.get_runtime_env_path(current_settings),
            self.get_legacy_env_path(current_settings),
        ):
            if path not in paths:
                paths.append(path)
        return paths

    def classify_env_path(self, env_path: Path, current_settings) -> str:
        resolved_path = env_path.expanduser().resolve()
        runtime_path = self.get_runtime_env_path(current_settings).expanduser().resolve()
        legacy_path = self.get_legacy_env_path(current_settings).expanduser().resolve()

        if resolved_path == runtime_path:
            return "runtime_secrets_file"
        if resolved_path == legacy_path:
            return "legacy_env_file"
        return "custom_secrets_file"

    def describe_env_path(self, env_path: Path, current_settings) -> dict:
        resolved_path = env_path.expanduser().resolve()
        exists = resolved_path.exists()
        read_check_path = resolved_path if exists else resolved_path.parent
        write_check_path = resolved_path if exists else resolved_path.parent

        return {
            "path": str(resolved_path),
            "classification": self.classify_env_path(resolved_path, current_settings),
            "exists": exists,
            "readable": os.access(read_check_path, os.R_OK),
            "writable": os.access(write_check_path, os.W_OK),
        }

    def build_secret_posture(self, current_settings, extra_env_files: list[str] | None = None) -> dict:
        runtime_path = self.get_runtime_env_path(current_settings)
        legacy_path = self.get_legacy_env_path(current_settings)
        posture = {
            "runtime": self.describe_env_path(runtime_path, current_settings),
            "legacy": self.describe_env_path(legacy_path, current_settings),
            "sync_targets": [],
        }
        for env_file in extra_env_files or []:
            posture["sync_targets"].append(
                self.describe_env_path(Path(env_file), current_settings)
            )
        return posture

    def build_tenant_db_password_env_var_name(self, tenant_slug: str) -> str:
        normalized_slug = tenant_slug.upper().replace("-", "_")
        return f"TENANT_DB_PASSWORD__{normalized_slug}"

    def resolve_tenant_db_password(self, tenant_slug: str, current_settings) -> str:
        normalized_slug = tenant_slug.upper().replace("-", "_")
        candidates = [
            self.build_tenant_db_password_env_var_name(tenant_slug),
            f"TENANT_BOOTSTRAP_DB_PASSWORD_{normalized_slug}",
        ]

        for env_var in candidates:
            for env_path in self.get_candidate_env_paths(current_settings):
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

    def clear_tenant_db_password(
        self,
        tenant_slug: str,
        env_path: Path,
    ) -> None:
        env_var = self.build_tenant_db_password_env_var_name(tenant_slug)
        os.environ.pop(env_var, None)
        self._remove_env_var(env_path, env_var)

    def mask_secret(self, value: str, visible: int = 4) -> str:
        if len(value) <= visible:
            return "*" * len(value)

        hidden_length = len(value) - visible
        return ("*" * hidden_length) + value[-visible:]

    def _upsert_env_var(self, env_path: Path, env_var: str, value: str) -> None:
        env_path.parent.mkdir(parents=True, exist_ok=True)
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

        try:
            lines = env_path.read_text(encoding="utf-8").splitlines()
        except PermissionError:
            return None

        for line in lines:
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
