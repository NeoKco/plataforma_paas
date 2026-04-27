from __future__ import annotations

import json
import re
from typing import Any

from app.common.config.settings import settings
from app.apps.tenant_modules.products.services.ai_client_service import (
    ProductCatalogAiClientService,
)
from app.apps.tenant_modules.products.services.ai_postprocessing_service import (
    ProductCatalogAiPostprocessingService,
)
from app.apps.tenant_modules.products.services.ai_preprocessing_service import (
    ProductCatalogAiPreprocessingService,
)
from app.common.security.ai_runtime_secret_service import AIRuntimeSecretService


class ProductCatalogGenericAiExtractionService:
    def __init__(self) -> None:
        self._preprocessing_service = ProductCatalogAiPreprocessingService()
        self._ai_client_service = ProductCatalogAiClientService()
        self._postprocessing_service = ProductCatalogAiPostprocessingService()
        self._ai_runtime_secret_service = AIRuntimeSecretService()

    def extract_from_url(
        self,
        url: str,
        *,
        timeout_seconds: int | None = None,
        prompt_override: str | None = None,
    ) -> dict[str, Any]:
        self._ensure_ai_configured()
        nombre, precio, specs = self._preprocess_url(
            url, timeout_seconds=timeout_seconds
        )
        prompt = self._build_prompt(
            nombre,
            precio,
            specs,
            prompt_override=prompt_override,
        )
        raw = self._analyze_prompt(prompt, timeout_seconds=timeout_seconds)
        ctx = {
            "url": url,
            "nombre": nombre,
            "precio": precio,
            "especificaciones": specs,
        }
        parsed = self._postprocess_llm_response(raw, ctx)
        if parsed.get("_fallback"):
            raise RuntimeError("La API IA devolvió una respuesta no utilizable para el catálogo")
        characteristics = self._map_characteristics(parsed.get("caracteristicas") or [])
        description = self._normalize_plain(parsed.get("descripcion"))
        excerpt = self._build_source_excerpt(description, characteristics)
        return {
            "name": self._normalize_catalog_name(nombre),
            "unit_price": self._parse_price(precio),
            "currency_code": "CLP",
            "description": description,
            "source_excerpt": excerpt,
            "characteristics": characteristics,
            "extraction_notes": (
                "Extracción IA genérica desde URL\n"
                "[products-enrichment:ai_full_generic] prompt técnico + postproceso estructurado"
            ),
            "used_ai_enrichment": True,
            "extraction_strategy": "ai_full_generic",
            "ai_raw_response": raw,
            "ai_spec_count": len(specs),
        }

    def _ensure_ai_configured(self) -> None:
        self._ai_client_service.ensure_ai_configured()

    def _preprocess_url(
        self,
        url: str,
        *,
        timeout_seconds: int | None = None,
    ) -> tuple[str, str, list[tuple[str, str]]]:
        ai_config = self._ai_runtime_secret_service.resolve_config(settings)
        return self._preprocessing_service.preprocess_url(
            url,
            timeout_seconds=max(int(timeout_seconds or ai_config["timeout"] or 30), 10),
        )

    def _build_prompt(
        self,
        nombre: str,
        precio: str,
        especificaciones: list[tuple[str, str]],
        *,
        prompt_override: str | None = None,
    ) -> str:
        return self._postprocessing_service.build_prompt(
            nombre,
            precio,
            especificaciones,
            prompt_override=prompt_override,
        )

    def _analyze_prompt(self, prompt: str, *, timeout_seconds: int | None = None) -> str:
        return self._ai_client_service.analyze_prompt(
            prompt,
            timeout_seconds=timeout_seconds,
        )

    def _postprocess_llm_response(self, raw_text: str, ctx: dict[str, Any]) -> dict[str, Any]:
        return self._postprocessing_service.postprocess_llm_response(raw_text, ctx)

    def _extract_json_array(self, text: str) -> Any:
        return self._postprocessing_service._extract_json_array(text)

    def _map_characteristics(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return self._postprocessing_service.map_characteristics(items)

    def _build_source_excerpt(
        self,
        description: str | None,
        characteristics: list[dict[str, Any]],
    ) -> str | None:
        return self._postprocessing_service.build_source_excerpt(
            description,
            characteristics,
        )

    def _normalize_valor_unidad(self, valor: str, unidad: str) -> tuple[str, str]:
        return self._postprocessing_service.normalize_valor_unidad(valor, unidad)

    def _norm_key(self, value: str) -> str:
        text = self._normalize_plain(value) or ""
        text = text.lower()
        text = (
            text.replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
        )
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _prettify_key(self, value: str) -> str:
        normalized = self._normalize_plain(value) or ""
        if not normalized:
            return ""
        return normalized[:1].upper() + normalized[1:]

    def _loose_norm_text(self, value: str) -> str:
        text = self._normalize_plain(value) or ""
        text = text.lower()
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _is_noise_line(self, value: str) -> bool:
        text = (value or "").strip()
        if not text:
            return True
        return self._preprocessing_service.is_noise_line(text)

    def _parse_price(self, value: str | None) -> float:
        text = re.sub(r"[^\d]", "", (value or "").strip())
        if not text:
            return 0.0
        try:
            return float(text)
        except Exception:
            return 0.0

    def _normalize_plain(self, value: Any) -> str | None:
        if value in (None, ""):
            return None
        text = str(value).strip()
        return text or None

    def _extract_heading_name(self, tag: Any) -> str:
        return self._preprocessing_service.extract_heading_name(tag)

    def _normalize_catalog_name(self, value: Any) -> str | None:
        text = self._normalize_plain(value)
        if not text:
            return text
        return self._preprocessing_service.normalize_catalog_name(text)
