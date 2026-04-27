from __future__ import annotations

from app.common.config.settings import settings
from app.common.security.ai_runtime_secret_service import AIRuntimeSecretService


class ProductCatalogAiClientService:
    def __init__(self) -> None:
        self._ai_runtime_secret_service = AIRuntimeSecretService()

    def ensure_ai_configured(self) -> None:
        config = self._ai_runtime_secret_service.resolve_config(settings)
        api_url = (config["api_url"] or "").strip()
        api_key = (config["api_key"] or "").strip()
        if api_url and api_key:
            return
        raise ValueError(
            "Scraping IA bloqueado: faltan API_IA_URL y/o MANAGER_API_IA_KEY en el runtime"
        )

    def analyze_prompt(self, prompt: str, *, timeout_seconds: int | None = None) -> str:
        try:
            import requests
        except ModuleNotFoundError as exc:  # pragma: no cover - runtime dependency
            raise RuntimeError("La integración IA requiere requests instalado") from exc

        self.ensure_ai_configured()
        config = self._ai_runtime_secret_service.resolve_config(settings)

        headers = {"Content-Type": "application/json"}
        api_key = (config["api_key"] or "").strip()
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        payload = {
            "model_id": (config["model_id"] or "").strip() or "mistral-ollama",
            "prompt": prompt,
            "options": {
                "max_tokens": int(config["max_tokens"] or 1200),
                "temperature": float(config["temperature"] or 0.2),
            },
        }
        base_url = (config["api_url"] or "").strip().rstrip("/")
        endpoint = (
            base_url if base_url.lower().endswith("/analyze") else f"{base_url}/analyze"
        )
        response = requests.post(
            endpoint,
            json=payload,
            headers=headers,
            timeout=max(int(timeout_seconds or config["timeout"] or 240), 30),
        )
        if not response.ok:
            body = (response.text or "").strip()
            raise RuntimeError(f"API IA devolvió {response.status_code}: {body}")
        if (response.headers.get("Content-Type", "") or "").startswith("application/json"):
            data = response.json()
        else:
            data = response.text
        if isinstance(data, dict) and isinstance(data.get("response"), str):
            return data["response"]
        if (
            isinstance(data, dict)
            and isinstance(data.get("raw"), dict)
            and isinstance(data["raw"].get("response"), str)
        ):
            return data["raw"]["response"]
        if isinstance(data, dict) and isinstance(data.get("text"), str):
            return data["text"]
        if isinstance(data, str):
            return data
        return str(data)
