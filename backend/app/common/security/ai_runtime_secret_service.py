from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from app.common.config.settings import BASE_DIR


class AIRuntimeSecretService:
    ENV_VAR_NAMES = {
        "api_url": "API_IA_URL",
        "api_key": "MANAGER_API_IA_KEY",
        "model_id": "API_IA_MODEL_ID",
        "max_tokens": "API_IA_MAX_TOKENS",
        "temperature": "API_IA_TEMPERATURE",
        "timeout": "API_IA_TIMEOUT",
    }

    def get_runtime_env_path(self, current_settings) -> Path:
        return Path(
            getattr(
                current_settings,
                "AI_RUNTIME_SECRETS_FILE",
                Path(getattr(current_settings, "BASE_DIR", BASE_DIR))
                / ".runtime-ai-secrets.env",
            )
        )

    def get_legacy_env_path(self, current_settings) -> Path:
        return Path(getattr(current_settings, "BASE_DIR", BASE_DIR)) / ".env"

    def classify_env_path(self, env_path: Path, current_settings) -> str:
        resolved_path = env_path.expanduser().resolve()
        runtime_path = self.get_runtime_env_path(current_settings).expanduser().resolve()
        legacy_path = self.get_legacy_env_path(current_settings).expanduser().resolve()

        if resolved_path == runtime_path:
            return "runtime_ai_secrets_file"
        if resolved_path == legacy_path:
            return "legacy_env_file"
        return "custom_secrets_file"

    def describe_env_path(self, env_path: Path, current_settings) -> dict[str, Any]:
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

    def resolve_config(self, current_settings) -> dict[str, Any]:
        runtime_path = self.get_runtime_env_path(current_settings)
        runtime_values = {
            key: self._read_env_var_from_file(runtime_path, env_var)
            for key, env_var in self.ENV_VAR_NAMES.items()
        }

        values = {
            "api_url": self._coerce_str(
                runtime_values["api_url"] or getattr(current_settings, "API_IA_URL", "")
            ),
            "api_key": self._coerce_str(
                runtime_values["api_key"]
                or getattr(current_settings, "MANAGER_API_IA_KEY", "")
            ),
            "model_id": self._coerce_str(
                runtime_values["model_id"]
                or getattr(current_settings, "API_IA_MODEL_ID", "")
                or "mistral-ollama"
            ),
            "max_tokens": self._coerce_int(
                runtime_values["max_tokens"],
                getattr(current_settings, "API_IA_MAX_TOKENS", 1200),
                default=1200,
            ),
            "temperature": self._coerce_float(
                runtime_values["temperature"],
                getattr(current_settings, "API_IA_TEMPERATURE", 0.1),
                default=0.1,
            ),
            "timeout": self._coerce_int(
                runtime_values["timeout"],
                getattr(current_settings, "API_IA_TIMEOUT", 45),
                default=45,
            ),
        }
        values["source"] = (
            "runtime_ai_secrets_file"
            if any(runtime_values.get(key) not in (None, "") for key in runtime_values)
            else "settings"
        )
        return values

    def build_public_config(self, current_settings) -> dict[str, Any]:
        runtime_path = self.get_runtime_env_path(current_settings)
        legacy_path = self.get_legacy_env_path(current_settings)
        config = self.resolve_config(current_settings)
        return {
            "app_env": getattr(current_settings, "APP_ENV", "development"),
            "runtime_secret_file": self.describe_env_path(runtime_path, current_settings),
            "legacy_env_file": self.describe_env_path(legacy_path, current_settings),
            "isolated_from_legacy": runtime_path.expanduser().resolve()
            != legacy_path.expanduser().resolve(),
            "source": config["source"],
            "api_url": config["api_url"],
            "model_id": config["model_id"],
            "max_tokens": config["max_tokens"],
            "temperature": config["temperature"],
            "timeout": config["timeout"],
            "api_key_configured": bool(config["api_key"]),
            "api_key_masked": (
                self.mask_secret(config["api_key"]) if config["api_key"] else None
            ),
        }

    def store_config(self, current_settings, payload) -> dict[str, Any]:
        current = self.resolve_config(current_settings)
        runtime_path = self.get_runtime_env_path(current_settings)

        api_key = current["api_key"]
        incoming_key = self._coerce_str(getattr(payload, "api_key", None))
        replace_api_key = bool(getattr(payload, "replace_api_key", False))
        if replace_api_key:
            if not incoming_key:
                raise ValueError("Debes ingresar una API key nueva para reemplazar la actual")
            api_key = incoming_key

        config = {
            "api_url": self._coerce_str(getattr(payload, "api_url", "")),
            "api_key": api_key,
            "model_id": self._coerce_str(getattr(payload, "model_id", "")) or "mistral-ollama",
            "max_tokens": self._coerce_int(
                getattr(payload, "max_tokens", None),
                current["max_tokens"],
                default=1200,
            ),
            "temperature": self._coerce_float(
                getattr(payload, "temperature", None),
                current["temperature"],
                default=0.1,
            ),
            "timeout": self._coerce_int(
                getattr(payload, "timeout", None),
                current["timeout"],
                default=45,
            ),
        }

        for key, env_var in self.ENV_VAR_NAMES.items():
            value = config[key]
            os.environ[env_var] = str(value)
            self._upsert_env_var(runtime_path, env_var, str(value))

        return self.build_public_config(current_settings)

    def validate_connection(self, current_settings, payload=None) -> dict[str, Any]:
        try:
            import requests
        except ModuleNotFoundError as exc:  # pragma: no cover - runtime dependency
            raise RuntimeError("La validación IA requiere requests instalado") from exc

        config = self.resolve_config(current_settings)
        if payload is not None:
            override_url = self._coerce_str(getattr(payload, "api_url", ""))
            override_model = self._coerce_str(getattr(payload, "model_id", ""))
            override_key = self._coerce_str(getattr(payload, "api_key", None))
            replace_api_key = bool(getattr(payload, "replace_api_key", False))
            if override_url:
                config["api_url"] = override_url
            if override_model:
                config["model_id"] = override_model
            if getattr(payload, "max_tokens", None) is not None:
                config["max_tokens"] = self._coerce_int(
                    getattr(payload, "max_tokens", None),
                    config["max_tokens"],
                    default=1200,
                )
            if getattr(payload, "temperature", None) is not None:
                config["temperature"] = self._coerce_float(
                    getattr(payload, "temperature", None),
                    config["temperature"],
                    default=0.1,
                )
            if getattr(payload, "timeout", None) is not None:
                config["timeout"] = self._coerce_int(
                    getattr(payload, "timeout", None),
                    config["timeout"],
                    default=45,
                )
            if replace_api_key:
                if not override_key:
                    raise ValueError("Debes ingresar una API key nueva para validar el reemplazo")
                config["api_key"] = override_key

        if not config["api_url"]:
            raise ValueError("Debes configurar API_IA_URL antes de validar")
        if not config["api_key"]:
            raise ValueError("Debes configurar MANAGER_API_IA_KEY antes de validar")

        endpoint = config["api_url"].rstrip("/")
        if not endpoint.lower().endswith("/analyze"):
            endpoint = f"{endpoint}/analyze"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config['api_key']}",
        }
        validation_payload = {
            "model_id": config["model_id"],
            "prompt": (
                'Responde solo JSON válido con la forma {"status":"ok","source":"platform_paas"}'
            ),
            "options": {
                "max_tokens": min(int(config["max_tokens"] or 1200), 256),
                "temperature": min(float(config["temperature"] or 0.1), 0.3),
            },
        }
        response = requests.post(
            endpoint,
            json=validation_payload,
            headers=headers,
            timeout=max(int(config["timeout"] or 45), 30),
        )
        if not response.ok:
            body = (response.text or "").strip()
            raise RuntimeError(f"API IA devolvió {response.status_code}: {body}")

        return {
            "reachable": True,
            "endpoint": endpoint,
            "source": config["source"],
            "api_key_configured": bool(config["api_key"]),
            "model_id": config["model_id"],
            "timeout": config["timeout"],
            "detail": "Conexión validada correctamente contra /analyze",
        }

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

    @staticmethod
    def _coerce_str(value: Any) -> str:
        if value is None:
            return ""
        return str(value).strip()

    @staticmethod
    def _coerce_int(value: Any, fallback: Any, *, default: int) -> int:
        for candidate in (value, fallback, default):
            if candidate in (None, ""):
                continue
            try:
                return int(candidate)
            except (TypeError, ValueError):
                continue
        return default

    @staticmethod
    def _coerce_float(value: Any, fallback: Any, *, default: float) -> float:
        for candidate in (value, fallback, default):
            if candidate in (None, ""):
                continue
            try:
                return float(candidate)
            except (TypeError, ValueError):
                continue
        return default
