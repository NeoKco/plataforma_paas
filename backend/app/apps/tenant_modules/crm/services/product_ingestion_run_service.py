from __future__ import annotations

from datetime import datetime, timezone

from app.apps.platform_control.models.tenant import Tenant
from app.apps.tenant_modules.core.services.tenant_connection_service import TenantConnectionService
from app.apps.tenant_modules.crm.models import (
    CRMProductIngestionDraft,
    CRMProductIngestionRun,
    CRMProductIngestionRunItem,
)
from app.apps.tenant_modules.crm.schemas import (
    CRMProductIngestionDraftCreateRequest,
    CRMProductIngestionExtractUrlRequest,
    CRMProductIngestionRunCreateRequest,
)
from app.apps.tenant_modules.crm.services.product_ingestion_extraction_service import (
    CRMProductIngestionExtractionService,
)
from app.apps.tenant_modules.crm.services.product_ingestion_service import CRMProductIngestionService
from app.common.db.control_database import ControlSessionLocal


class CRMProductIngestionRunService:
    VALID_RUN_STATUSES = {"queued", "running", "completed", "cancelled", "failed"}
    VALID_ITEM_STATUSES = {"queued", "processing", "completed", "error", "cancelled"}

    def __init__(
        self,
        extraction_service: CRMProductIngestionExtractionService | None = None,
        ingestion_service: CRMProductIngestionService | None = None,
        tenant_connection_service: TenantConnectionService | None = None,
    ) -> None:
        self._extraction_service = extraction_service or CRMProductIngestionExtractionService()
        self._ingestion_service = ingestion_service or CRMProductIngestionService()
        self._tenant_connection_service = tenant_connection_service or TenantConnectionService()

    def list_runs(self, tenant_db) -> list[CRMProductIngestionRun]:
        return (
            tenant_db.query(CRMProductIngestionRun)
            .order_by(CRMProductIngestionRun.created_at.desc(), CRMProductIngestionRun.id.desc())
            .all()
        )

    def get_run(self, tenant_db, run_id: int) -> CRMProductIngestionRun:
        item = tenant_db.get(CRMProductIngestionRun, run_id)
        if item is None:
            raise ValueError("Corrida de ingesta no encontrada")
        return item

    def get_run_item_map(self, tenant_db, run_ids: list[int]) -> dict[int, list[CRMProductIngestionRunItem]]:
        normalized_ids = [item for item in run_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMProductIngestionRunItem)
            .filter(CRMProductIngestionRunItem.run_id.in_(normalized_ids))
            .order_by(CRMProductIngestionRunItem.id.asc())
            .all()
        )
        grouped: dict[int, list[CRMProductIngestionRunItem]] = {}
        for row in rows:
            grouped.setdefault(row.run_id, []).append(row)
        return grouped

    def create_run(self, tenant_db, payload: CRMProductIngestionRunCreateRequest, *, actor_user_id: int | None = None) -> CRMProductIngestionRun:
        entries = [item for item in payload.entries if (item.source_url or "").strip()]
        if not entries:
            raise ValueError("Debes enviar al menos una URL para iniciar la corrida")
        run = CRMProductIngestionRun(
            status="queued",
            source_mode="url_batch",
            source_label=self._normalize_optional(payload.source_label),
            requested_count=len(entries),
            processed_count=0,
            completed_count=0,
            error_count=0,
            cancelled_count=0,
            created_by_user_id=actor_user_id,
            started_at=None,
            finished_at=None,
            cancelled_at=None,
            last_error=None,
        )
        tenant_db.add(run)
        tenant_db.flush()
        for entry in entries:
            tenant_db.add(
                CRMProductIngestionRunItem(
                    run_id=run.id,
                    source_url=(entry.source_url or "").strip(),
                    source_label=self._normalize_optional(entry.source_label or payload.source_label),
                    external_reference=self._normalize_optional(entry.external_reference),
                    item_status="queued",
                    draft_id=None,
                    extracted_name=None,
                    error_message=None,
                    processed_at=None,
                )
            )
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    def cancel_run(self, tenant_db, run_id: int) -> CRMProductIngestionRun:
        run = self.get_run(tenant_db, run_id)
        if run.status in {"completed", "failed"}:
            raise ValueError("La corrida ya terminó y no puede cancelarse")
        run.status = "cancelled"
        run.cancelled_at = self._now()
        run.updated_at = self._now()
        tenant_db.add(run)
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    def extract_url_to_draft(self, tenant_db, payload: CRMProductIngestionExtractUrlRequest, *, actor_user_id: int | None = None) -> CRMProductIngestionDraft:
        extraction = self._extraction_service.extract_from_url(payload.source_url)
        draft_payload = CRMProductIngestionDraftCreateRequest(
            source_kind="url_reference",
            source_label=self._normalize_optional(payload.source_label),
            source_url=payload.source_url.strip(),
            external_reference=self._normalize_optional(payload.external_reference),
            sku=extraction.get("sku"),
            name=extraction.get("name"),
            brand=extraction.get("brand"),
            category_label=extraction.get("category_label"),
            product_type=extraction.get("product_type") or "product",
            unit_label=extraction.get("unit_label"),
            unit_price=float(extraction.get("unit_price") or 0),
            currency_code=extraction.get("currency_code") or "CLP",
            description=extraction.get("description"),
            source_excerpt=extraction.get("source_excerpt"),
            extraction_notes=extraction.get("extraction_notes"),
            characteristics=extraction.get("characteristics") or [],
        )
        return self._ingestion_service.create_draft(tenant_db, draft_payload, actor_user_id=actor_user_id)

    def process_run_background(self, tenant_slug: str, run_id: int) -> None:
        control_db = ControlSessionLocal()
        tenant_db = None
        try:
            tenant = self._tenant_connection_service.get_tenant_by_slug(control_db, tenant_slug)
            if tenant is None:
                return
            tenant_session_factory = self._tenant_connection_service.get_tenant_session(tenant)
            tenant_db = tenant_session_factory()
            self._process_run(tenant_db, run_id)
        finally:
            if tenant_db is not None:
                tenant_db.close()
            control_db.close()

    def _process_run(self, tenant_db, run_id: int) -> None:
        run = self.get_run(tenant_db, run_id)
        if run.status in {"completed", "failed"}:
            return
        if run.status != "cancelled":
            run.status = "running"
            run.started_at = run.started_at or self._now()
            run.updated_at = self._now()
            tenant_db.add(run)
            tenant_db.commit()

        items = self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
        for item in items:
            tenant_db.refresh(run)
            if run.status == "cancelled":
                self._cancel_remaining_items(tenant_db, run_id)
                self._refresh_run_totals(tenant_db, run_id)
                return
            if item.item_status not in {"queued", "error"}:
                continue
            item.item_status = "processing"
            item.updated_at = self._now()
            tenant_db.add(item)
            tenant_db.commit()

            try:
                draft = self.extract_url_to_draft(
                    tenant_db,
                    CRMProductIngestionExtractUrlRequest(
                        source_url=item.source_url,
                        source_label=item.source_label,
                        external_reference=item.external_reference,
                    ),
                    actor_user_id=run.created_by_user_id,
                )
                item.item_status = "completed"
                item.draft_id = draft.id
                item.extracted_name = draft.name
                item.error_message = None
                item.processed_at = self._now()
                tenant_db.add(item)
                tenant_db.commit()
            except Exception as exc:
                item.item_status = "error"
                item.error_message = str(exc)[:4000]
                item.processed_at = self._now()
                tenant_db.add(item)
                tenant_db.commit()

            self._refresh_run_totals(tenant_db, run_id)

        self._finalize_run(tenant_db, run_id)

    def _cancel_remaining_items(self, tenant_db, run_id: int) -> None:
        rows = self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
        for item in rows:
            if item.item_status == "queued":
                item.item_status = "cancelled"
                item.processed_at = self._now()
                tenant_db.add(item)
        tenant_db.commit()

    def _refresh_run_totals(self, tenant_db, run_id: int) -> CRMProductIngestionRun:
        run = self.get_run(tenant_db, run_id)
        items = self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
        run.processed_count = sum(1 for item in items if item.item_status in {"completed", "error", "cancelled"})
        run.completed_count = sum(1 for item in items if item.item_status == "completed")
        run.error_count = sum(1 for item in items if item.item_status == "error")
        run.cancelled_count = sum(1 for item in items if item.item_status == "cancelled")
        if run.error_count:
            last_error_item = next((item for item in reversed(items) if item.error_message), None)
            run.last_error = last_error_item.error_message if last_error_item else run.last_error
        run.updated_at = self._now()
        tenant_db.add(run)
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    def _finalize_run(self, tenant_db, run_id: int) -> CRMProductIngestionRun:
        run = self._refresh_run_totals(tenant_db, run_id)
        items = self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
        if run.status == "cancelled":
            run.finished_at = self._now()
        elif items and all(item.item_status in {"completed", "error", "cancelled"} for item in items):
            run.status = "completed" if run.completed_count > 0 or run.error_count == 0 else "failed"
            run.finished_at = self._now()
        run.updated_at = self._now()
        tenant_db.add(run)
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
