from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Any

from app.apps.tenant_modules.crm.models import (
    CRMProduct,
    CRMProductIngestionCharacteristic,
    CRMProductIngestionDraft,
)
from app.apps.tenant_modules.crm.schemas import (
    CRMProductIngestionCharacteristicWriteRequest,
)
from app.apps.tenant_modules.products.services.product_service import (
    ProductCatalogService,
)
from app.common.config.settings import settings


class ProductCatalogEnrichmentService:
    ENRICHMENT_MARKER = "[products-enrichment:"

    def __init__(self) -> None:
        self._product_service = ProductCatalogService()

    def build_duplicate_analysis_map(
        self,
        tenant_db,
        drafts: list[CRMProductIngestionDraft],
    ) -> dict[int, dict[str, Any]]:
        normalized_drafts = [item for item in drafts if item is not None]
        if not normalized_drafts:
            return {}

        catalog_items = self._product_service.list_products(
            tenant_db,
            include_inactive=True,
        )
        peer_drafts = tenant_db.query(CRMProductIngestionDraft).all()
        return {
            item.id: self._build_duplicate_analysis(
                item,
                catalog_items=catalog_items,
                peer_drafts=peer_drafts,
            )
            for item in normalized_drafts
        }

    def build_enrichment_state(self, draft: CRMProductIngestionDraft) -> dict[str, Any]:
        notes = draft.extraction_notes or ""
        marker_kind = None
        marker_summary = None
        for line in reversed(notes.splitlines()):
            stripped = line.strip()
            if not stripped.startswith(self.ENRICHMENT_MARKER):
                continue
            marker_kind = stripped.removeprefix(self.ENRICHMENT_MARKER).split("]", 1)[0]
            marker_summary = stripped.split("]", 1)[1].strip() if "]" in stripped else None
            break
        if marker_kind:
            return {
                "status": "ready",
                "strategy": marker_kind,
                "summary": marker_summary,
                "ai_available": bool(settings.API_IA_URL.strip()),
            }
        return {
            "status": "pending",
            "strategy": None,
            "summary": None,
            "ai_available": bool(settings.API_IA_URL.strip()),
        }

    def enrich_draft(
        self,
        tenant_db,
        draft_id: int,
        *,
        actor_user_id: int | None = None,
        prefer_ai: bool = True,
    ) -> CRMProductIngestionDraft:
        draft = tenant_db.get(CRMProductIngestionDraft, draft_id)
        if draft is None:
            raise ValueError("Borrador de ingesta no encontrado")
        if draft.capture_status == "approved":
            raise ValueError("No se puede enriquecer un borrador ya aprobado")

        current_characteristics = self._get_characteristics_for_draft(tenant_db, draft.id)
        heuristic_payload = self._build_heuristic_enrichment(draft, current_characteristics)
        ai_payload = (
            self._try_ai_enrichment(draft, current_characteristics)
            if prefer_ai
            else None
        )
        final_payload = self._merge_enrichment_payloads(
            heuristic_payload,
            ai_payload,
        )

        draft.name = final_payload["name"]
        draft.sku = final_payload["sku"]
        draft.brand = final_payload["brand"]
        draft.category_label = final_payload["category_label"]
        draft.product_type = final_payload["product_type"]
        draft.unit_label = final_payload["unit_label"]
        draft.unit_price = max(float(final_payload["unit_price"] or 0), 0)
        draft.description = final_payload["description"]
        draft.source_excerpt = final_payload["source_excerpt"]
        draft.extraction_notes = self._append_enrichment_note(
            draft.extraction_notes,
            strategy=final_payload["strategy"],
            summary=final_payload["summary"],
        )
        draft.updated_at = self._now()
        if actor_user_id is not None:
            draft.reviewed_by_user_id = actor_user_id
        tenant_db.add(draft)
        tenant_db.flush()
        self._replace_characteristics(
            tenant_db,
            draft.id,
            final_payload["characteristics"],
        )
        tenant_db.commit()
        tenant_db.refresh(draft)
        return draft

    def _build_duplicate_analysis(
        self,
        draft: CRMProductIngestionDraft,
        *,
        catalog_items: list[CRMProduct],
        peer_drafts: list[CRMProductIngestionDraft],
    ) -> dict[str, Any]:
        candidates: list[dict[str, Any]] = []
        for product in catalog_items:
            candidate = self._build_product_candidate(draft, product)
            if candidate:
                candidates.append(candidate)
        for peer in peer_drafts:
            if peer.id == draft.id:
                continue
            candidate = self._build_draft_candidate(draft, peer)
            if candidate:
                candidates.append(candidate)

        ordered = sorted(
            candidates,
            key=lambda item: (-item["score"], item["label"].lower(), item["candidate_id"]),
        )[:5]
        top_score = ordered[0]["score"] if ordered else 0
        if top_score >= 90:
            status = "high"
        elif top_score >= 55:
            status = "possible"
        else:
            status = "none"
        return {
            "status": status,
            "top_score": top_score,
            "candidate_count": len(ordered),
            "top_reason": ordered[0]["reasons"][0] if ordered else None,
            "candidates": ordered,
        }

    def _build_product_candidate(
        self,
        draft: CRMProductIngestionDraft,
        product: CRMProduct,
    ) -> dict[str, Any] | None:
        score = 0
        reasons: list[str] = []
        draft_sku = self._normalize_token(draft.sku)
        product_sku = self._normalize_token(product.sku)
        if draft_sku and product_sku and draft_sku == product_sku:
            score += 75
            reasons.append("SKU exacto ya existe en catálogo")

        draft_name = self._normalize_name(draft.name)
        product_name = self._normalize_name(product.name)
        ratio = self._similarity(draft_name, product_name)
        if draft_name and product_name:
            if draft_name == product_name:
                score += 45
                reasons.append("Nombre exacto ya existe en catálogo")
            elif ratio >= 0.92:
                score += 35
                reasons.append("Nombre casi idéntico en catálogo")
            elif ratio >= 0.8:
                score += 22
                reasons.append("Nombre muy parecido en catálogo")

        draft_brand = self._normalize_name(draft.brand)
        product_brand = self._extract_brand_from_product(product)
        if draft_brand and product_brand and draft_brand == product_brand:
            score += 15
            reasons.append("Marca coincidente")

        if score <= 0:
            return None
        return {
            "candidate_kind": "catalog_product",
            "candidate_id": product.id,
            "label": product.name,
            "sku": product.sku,
            "brand": draft.brand if draft_brand and draft_brand == product_brand else None,
            "capture_status": "catalog_active" if product.is_active else "catalog_inactive",
            "score": min(score, 100),
            "reasons": reasons,
        }

    def _build_draft_candidate(
        self,
        draft: CRMProductIngestionDraft,
        peer: CRMProductIngestionDraft,
    ) -> dict[str, Any] | None:
        score = 0
        reasons: list[str] = []
        draft_sku = self._normalize_token(draft.sku)
        peer_sku = self._normalize_token(peer.sku)
        if draft_sku and peer_sku and draft_sku == peer_sku:
            score += 70
            reasons.append("SKU exacto ya existe en otro borrador")

        draft_ref = self._normalize_token(draft.external_reference)
        peer_ref = self._normalize_token(peer.external_reference)
        if draft_ref and peer_ref and draft_ref == peer_ref:
            score += 50
            reasons.append("Referencia externa repetida")

        draft_url = self._normalize_token(draft.source_url)
        peer_url = self._normalize_token(peer.source_url)
        if draft_url and peer_url and draft_url == peer_url:
            score += 45
            reasons.append("URL fuente ya usada en otro borrador")

        draft_name = self._normalize_name(draft.name)
        peer_name = self._normalize_name(peer.name)
        ratio = self._similarity(draft_name, peer_name)
        if draft_name and peer_name:
            if draft_name == peer_name:
                score += 40
                reasons.append("Nombre exacto repetido en borradores")
            elif ratio >= 0.92:
                score += 30
                reasons.append("Nombre casi idéntico en borradores")
            elif ratio >= 0.8:
                score += 18
                reasons.append("Nombre muy parecido en borradores")

        draft_brand = self._normalize_name(draft.brand)
        peer_brand = self._normalize_name(peer.brand)
        if draft_brand and peer_brand and draft_brand == peer_brand:
            score += 12
            reasons.append("Marca coincidente")

        if score <= 0:
            return None
        return {
            "candidate_kind": "ingestion_draft",
            "candidate_id": peer.id,
            "label": peer.name or peer.source_label or f"draft-{peer.id}",
            "sku": peer.sku,
            "brand": peer.brand,
            "capture_status": peer.capture_status,
            "score": min(score, 100),
            "reasons": reasons,
        }

    def _build_heuristic_enrichment(
        self,
        draft: CRMProductIngestionDraft,
        characteristics: list[CRMProductIngestionCharacteristic],
    ) -> dict[str, Any]:
        name = self._normalize_display_name(draft.name)
        brand = self._normalize_brand(draft.brand)
        unit_label = self._normalize_unit_label(draft.unit_label, draft.description, characteristics)
        category_label = self._normalize_category(
            draft.category_label,
            draft.source_label,
            draft.description,
            characteristics,
        )
        description = self._normalize_description(draft.description, draft.source_excerpt)
        source_excerpt = self._normalize_source_excerpt(draft.source_excerpt, description, characteristics)
        product_type = self._normalize_product_type(draft.product_type, description, category_label)
        characteristics_payload = self._normalize_characteristics(characteristics, brand, category_label)
        summary_parts = []
        if name and name != (draft.name or ""):
            summary_parts.append("nombre normalizado")
        if brand and brand != (draft.brand or ""):
            summary_parts.append("marca normalizada")
        if category_label and category_label != (draft.category_label or ""):
            summary_parts.append("categoría sugerida")
        if description and description != (draft.description or ""):
            summary_parts.append("descripción compactada")
        if unit_label and unit_label != (draft.unit_label or ""):
            summary_parts.append("unidad sugerida")
        if not summary_parts:
            summary_parts.append("normalización mínima aplicada")
        return {
            "strategy": "heuristic",
            "summary": ", ".join(summary_parts),
            "sku": self._normalize_sku(draft.sku),
            "name": name or draft.name,
            "brand": brand or draft.brand,
            "category_label": category_label or draft.category_label,
            "product_type": product_type or draft.product_type or "product",
            "unit_label": unit_label or draft.unit_label,
            "unit_price": max(float(draft.unit_price or 0), 0),
            "description": description or draft.description,
            "source_excerpt": source_excerpt or draft.source_excerpt,
            "characteristics": characteristics_payload,
        }

    def _try_ai_enrichment(
        self,
        draft: CRMProductIngestionDraft,
        characteristics: list[CRMProductIngestionCharacteristic],
    ) -> dict[str, Any] | None:
        if not settings.API_IA_URL.strip():
            return None
        try:
            import requests
        except ModuleNotFoundError:
            return None

        payload = self._build_ai_request_payload(draft, characteristics)
        headers = {"Content-Type": "application/json"}
        if settings.MANAGER_API_IA_KEY.strip():
            headers["Authorization"] = f"Bearer {settings.MANAGER_API_IA_KEY.strip()}"

        try:
            response = requests.post(
                settings.API_IA_URL.rstrip("/") + "/analyze",
                json=payload,
                headers=headers,
                timeout=max(int(settings.API_IA_TIMEOUT or 45), 10),
            )
            response.raise_for_status()
            parsed = self._parse_ai_response(response.json())
        except Exception:
            return None

        if not parsed:
            return None
        parsed["strategy"] = "ai"
        parsed["summary"] = parsed.get("summary") or "sugerencias IA aplicadas"
        parsed["unit_price"] = max(float(parsed.get("unit_price") or draft.unit_price or 0), 0)
        parsed["product_type"] = self._normalize_product_type(
            parsed.get("product_type"),
            parsed.get("description") or draft.description,
            parsed.get("category_label") or draft.category_label,
        )
        parsed["sku"] = self._normalize_sku(parsed.get("sku") or draft.sku)
        parsed["name"] = self._normalize_display_name(parsed.get("name") or draft.name)
        parsed["brand"] = self._normalize_brand(parsed.get("brand") or draft.brand)
        parsed["category_label"] = self._normalize_category(
            parsed.get("category_label") or draft.category_label,
            draft.source_label,
            parsed.get("description") or draft.description,
            characteristics,
        )
        parsed["unit_label"] = self._normalize_unit_label(
            parsed.get("unit_label") or draft.unit_label,
            parsed.get("description") or draft.description,
            characteristics,
        )
        parsed["description"] = self._normalize_description(
            parsed.get("description") or draft.description,
            draft.source_excerpt,
        )
        parsed["source_excerpt"] = self._normalize_source_excerpt(
            draft.source_excerpt,
            parsed["description"],
            characteristics,
        )
        parsed["characteristics"] = self._normalize_characteristics(
            parsed.get("characteristics") or characteristics,
            parsed["brand"],
            parsed["category_label"],
        )
        return parsed

    def _build_ai_request_payload(
        self,
        draft: CRMProductIngestionDraft,
        characteristics: list[CRMProductIngestionCharacteristic],
    ) -> dict[str, Any]:
        structured_characteristics = [
            {"label": item.label, "value": item.value, "sort_order": item.sort_order}
            for item in characteristics
        ]
        prompt = (
            "Normaliza y enriquece un borrador de catálogo técnico-comercial. "
            "Devuelve solo JSON con keys: "
            "name, sku, brand, category_label, product_type, unit_label, "
            "unit_price, description, characteristics, summary. "
            "No inventes precios si no hay señal; conserva el valor original. "
            "No agregues texto fuera del JSON."
        )
        return {
            "model": settings.API_IA_MODEL_ID or None,
            "max_tokens": int(settings.API_IA_MAX_TOKENS or 1200),
            "temperature": float(settings.API_IA_TEMPERATURE or 0.1),
            "prompt": prompt,
            "input": {
                "name": draft.name,
                "sku": draft.sku,
                "brand": draft.brand,
                "category_label": draft.category_label,
                "product_type": draft.product_type,
                "unit_label": draft.unit_label,
                "unit_price": float(draft.unit_price or 0),
                "currency_code": draft.currency_code,
                "description": draft.description,
                "source_excerpt": draft.source_excerpt,
                "source_label": draft.source_label,
                "source_url": draft.source_url,
                "characteristics": structured_characteristics,
            },
        }

    def _parse_ai_response(self, payload: Any) -> dict[str, Any] | None:
        candidate = None
        if isinstance(payload, dict):
            candidate = (
                payload.get("result")
                or payload.get("response")
                or payload.get("content")
                or payload.get("data")
                or payload
            )
        else:
            candidate = payload
        if isinstance(candidate, str):
            try:
                candidate = json.loads(candidate)
            except json.JSONDecodeError:
                return None
        if not isinstance(candidate, dict):
            return None
        return candidate

    def _merge_enrichment_payloads(
        self,
        heuristic_payload: dict[str, Any],
        ai_payload: dict[str, Any] | None,
    ) -> dict[str, Any]:
        if not ai_payload:
            return heuristic_payload
        merged = dict(heuristic_payload)
        for key in (
            "sku",
            "name",
            "brand",
            "category_label",
            "product_type",
            "unit_label",
            "unit_price",
            "description",
            "source_excerpt",
            "strategy",
            "summary",
        ):
            value = ai_payload.get(key)
            if value not in (None, "", []):
                merged[key] = value
        if ai_payload.get("characteristics"):
            merged["characteristics"] = ai_payload["characteristics"]
        return merged

    def _get_characteristics_for_draft(
        self,
        tenant_db,
        draft_id: int,
    ) -> list[CRMProductIngestionCharacteristic]:
        return (
            tenant_db.query(CRMProductIngestionCharacteristic)
            .filter(CRMProductIngestionCharacteristic.draft_id == draft_id)
            .order_by(
                CRMProductIngestionCharacteristic.sort_order.asc(),
                CRMProductIngestionCharacteristic.id.asc(),
            )
            .all()
        )

    def _replace_characteristics(
        self,
        tenant_db,
        draft_id: int,
        characteristics_payload: list[CRMProductIngestionCharacteristicWriteRequest],
    ) -> None:
        tenant_db.query(CRMProductIngestionCharacteristic).filter(
            CRMProductIngestionCharacteristic.draft_id == draft_id
        ).delete()
        for index, item in enumerate(characteristics_payload or []):
            label = self._normalize_plain(getattr(item, "label", None))
            value = self._normalize_plain(getattr(item, "value", None))
            if not label or not value:
                continue
            tenant_db.add(
                CRMProductIngestionCharacteristic(
                    draft_id=draft_id,
                    label=label,
                    value=value,
                    sort_order=int(
                        getattr(item, "sort_order", None)
                        if getattr(item, "sort_order", None) is not None
                        else (index + 1) * 10
                    ),
                )
            )
        tenant_db.flush()

    def _normalize_characteristics(
        self,
        characteristics: list[Any],
        brand: str | None,
        category_label: str | None,
    ) -> list[CRMProductIngestionCharacteristicWriteRequest]:
        normalized: list[CRMProductIngestionCharacteristicWriteRequest] = []
        seen: set[tuple[str, str]] = set()
        for index, item in enumerate(characteristics or []):
            label = self._normalize_display_name(getattr(item, "label", None) if not isinstance(item, dict) else item.get("label"))
            value = self._normalize_plain(getattr(item, "value", None) if not isinstance(item, dict) else item.get("value"))
            if not label or not value:
                continue
            key = (label.lower(), value.lower())
            if key in seen:
                continue
            seen.add(key)
            normalized.append(
                CRMProductIngestionCharacteristicWriteRequest(
                    label=label,
                    value=value[:4000],
                    sort_order=int(
                        getattr(item, "sort_order", None)
                        if not isinstance(item, dict)
                        else item.get("sort_order", (index + 1) * 10)
                    )
                    if (
                        (getattr(item, "sort_order", None) if not isinstance(item, dict) else item.get("sort_order"))
                        is not None
                    )
                    else (index + 1) * 10,
                )
            )
        self._append_characteristic(normalized, "Marca", brand)
        self._append_characteristic(normalized, "Categoría", category_label)
        return normalized[:40]

    def _append_characteristic(
        self,
        target: list[CRMProductIngestionCharacteristicWriteRequest],
        label: str,
        value: str | None,
    ) -> None:
        normalized_value = self._normalize_plain(value)
        if not normalized_value:
            return
        labels = {item.label.strip().lower() for item in target if item.label}
        if label.strip().lower() in labels:
            return
        target.append(
            CRMProductIngestionCharacteristicWriteRequest(
                label=label,
                value=normalized_value,
                sort_order=(len(target) + 1) * 10,
            )
        )

    def _append_enrichment_note(
        self,
        current_notes: str | None,
        *,
        strategy: str,
        summary: str | None,
    ) -> str:
        lines = []
        for line in (current_notes or "").splitlines():
            if line.strip().startswith(self.ENRICHMENT_MARKER):
                continue
            lines.append(line.rstrip())
        marker = f"{self.ENRICHMENT_MARKER}{strategy}] {summary or 'enriquecimiento aplicado'}"
        lines = [line for line in lines if line]
        lines.append(marker)
        return "\n".join(lines)

    def _normalize_display_name(self, value: str | None) -> str | None:
        text = self._normalize_plain(value)
        if not text:
            return None
        preserved = []
        for token in text.split():
            if len(token) <= 4 and token.isupper():
                preserved.append(token)
            else:
                preserved.append(token[:1].upper() + token[1:].lower())
        return " ".join(preserved)

    def _normalize_brand(self, value: str | None) -> str | None:
        text = self._normalize_plain(value)
        if not text:
            return None
        return self._normalize_display_name(text)

    def _normalize_category(
        self,
        value: str | None,
        source_label: str | None,
        description: str | None,
        characteristics: list[Any],
    ) -> str | None:
        explicit = self._normalize_display_name(value)
        if explicit:
            return explicit
        haystack = " ".join(
            filter(
                None,
                [
                    self._normalize_plain(source_label),
                    self._normalize_plain(description),
                    " ".join(
                        filter(
                            None,
                            [
                                self._normalize_plain(getattr(item, "label", None) if not isinstance(item, dict) else item.get("label"))
                                for item in characteristics
                            ],
                        )
                    ),
                ],
            )
        ).lower()
        category_hints = [
            ("Bombas", ("bomba", "hidroneumatic")),
            ("Calefacción", ("caldera", "calef", "heat pipe", "placa plana")),
            ("Solar", ("solar", "fotovolta", "panel")),
            ("Hidráulica", ("válvula", "valvula", "tuber", "caudal")),
            ("Control", ("sensor", "controlador", "termostato")),
        ]
        for label, hints in category_hints:
            if any(hint in haystack for hint in hints):
                return label
        return None

    def _normalize_description(
        self,
        description: str | None,
        source_excerpt: str | None,
    ) -> str | None:
        text = self._normalize_plain(description) or self._normalize_plain(source_excerpt)
        if not text:
            return None
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text[:4000]

    def _normalize_source_excerpt(
        self,
        source_excerpt: str | None,
        description: str | None,
        characteristics: list[Any],
    ) -> str | None:
        excerpt = self._normalize_plain(source_excerpt)
        if excerpt:
            return excerpt[:4000]
        lines = []
        normalized_description = self._normalize_plain(description)
        if normalized_description:
            lines.append(normalized_description[:600])
        for item in characteristics[:8]:
            label = self._normalize_plain(getattr(item, "label", None) if not isinstance(item, dict) else item.get("label"))
            value = self._normalize_plain(getattr(item, "value", None) if not isinstance(item, dict) else item.get("value"))
            if label and value:
                lines.append(f"{label}: {value}")
        if not lines:
            return None
        return "\n".join(lines)[:4000]

    def _normalize_unit_label(
        self,
        value: str | None,
        description: str | None,
        characteristics: list[Any],
    ) -> str | None:
        explicit = self._normalize_plain(value)
        if explicit:
            return explicit.lower()
        haystack = " ".join(
            filter(
                None,
                [
                    self._normalize_plain(description),
                    " ".join(
                        filter(
                            None,
                            [
                                self._normalize_plain(getattr(item, "value", None) if not isinstance(item, dict) else item.get("value"))
                                for item in characteristics
                            ],
                        )
                    ),
                ],
            )
        ).lower()
        if "kit" in haystack:
            return "kit"
        if "servicio" in haystack or "mantención" in haystack or "mantencion" in haystack:
            return "servicio"
        return "unidad"

    def _normalize_product_type(
        self,
        value: str | None,
        description: str | None,
        category_label: str | None,
    ) -> str:
        explicit = (value or "").strip().lower()
        if explicit in {"product", "service"}:
            return explicit
        haystack = " ".join(
            filter(
                None,
                [
                    self._normalize_plain(description),
                    self._normalize_plain(category_label),
                ],
            )
        ).lower()
        if any(token in haystack for token in ("servicio", "instalación", "instalacion", "mantención", "mantencion")):
            return "service"
        return "product"

    def _normalize_sku(self, value: str | None) -> str | None:
        text = self._normalize_plain(value)
        if not text:
            return None
        cleaned = re.sub(r"\s+", "-", text.upper())
        return cleaned[:80]

    def _extract_brand_from_product(self, product: CRMProduct) -> str | None:
        product_description = self._normalize_plain(product.description)
        if not product_description:
            return None
        match = re.search(r"marca[:\s]+([A-Za-z0-9\-\s]+)", product_description, re.I)
        if match:
            return self._normalize_name(match.group(1))
        return None

    @staticmethod
    def _normalize_plain(value: str | None) -> str | None:
        text = re.sub(r"\s+", " ", (value or "")).strip()
        return text or None

    def _normalize_name(self, value: str | None) -> str | None:
        text = self._normalize_plain(value)
        return text.lower() if text else None

    @staticmethod
    def _normalize_token(value: str | None) -> str | None:
        text = re.sub(r"\s+", "", (value or "")).strip().lower()
        return text or None

    @staticmethod
    def _similarity(left: str | None, right: str | None) -> float:
        if not left or not right:
            return 0.0
        return SequenceMatcher(None, left, right).ratio()

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
