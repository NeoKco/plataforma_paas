from app.apps.tenant_modules.techdocs.schemas import (
    TechDocsAuditEventItemResponse,
    TechDocsDossierItemResponse,
    TechDocsEvidenceItemResponse,
    TechDocsMeasurementItemResponse,
    TechDocsSectionItemResponse,
)


def build_dossier_item(item, *, maps: dict[str, dict[int, str]] | None = None) -> TechDocsDossierItemResponse:
    maps = maps or {}
    return TechDocsDossierItemResponse(
        id=item.id,
        client_id=item.client_id,
        client_display_name=maps.get("clients", {}).get(item.client_id),
        site_id=item.site_id,
        site_display_name=maps.get("sites", {}).get(item.site_id),
        installation_id=item.installation_id,
        installation_display_name=maps.get("installations", {}).get(item.installation_id),
        opportunity_id=item.opportunity_id,
        opportunity_title=maps.get("opportunities", {}).get(item.opportunity_id),
        work_order_id=item.work_order_id,
        work_order_title=maps.get("work_orders", {}).get(item.work_order_id),
        task_id=item.task_id,
        task_title=maps.get("tasks", {}).get(item.task_id),
        owner_user_id=item.owner_user_id,
        owner_user_display_name=maps.get("users", {}).get(item.owner_user_id),
        title=item.title,
        dossier_type=item.dossier_type,
        status=item.status,
        summary=item.summary,
        objective=item.objective,
        scope_notes=item.scope_notes,
        technical_notes=item.technical_notes,
        version=item.version,
        approved_by_user_id=item.approved_by_user_id,
        approved_by_display_name=maps.get("users", {}).get(item.approved_by_user_id),
        approved_at=item.approved_at,
        is_active=item.is_active,
        created_by_user_id=item.created_by_user_id,
        created_by_display_name=maps.get("users", {}).get(item.created_by_user_id),
        updated_by_user_id=item.updated_by_user_id,
        updated_by_display_name=maps.get("users", {}).get(item.updated_by_user_id),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def build_section_item(item, measurements: list, *, maps: dict[str, dict[int, str]] | None = None) -> TechDocsSectionItemResponse:
    return TechDocsSectionItemResponse(
        id=item.id,
        dossier_id=item.dossier_id,
        section_kind=item.section_kind,
        title=item.title,
        notes=item.notes,
        sort_order=item.sort_order,
        created_at=item.created_at,
        measurements=[build_measurement_item(measurement) for measurement in measurements],
    )


def build_measurement_item(item) -> TechDocsMeasurementItemResponse:
    return TechDocsMeasurementItemResponse(
        id=item.id,
        dossier_id=item.dossier_id,
        section_id=item.section_id,
        label=item.label,
        measured_value=item.measured_value,
        unit=item.unit,
        expected_range=item.expected_range,
        notes=item.notes,
        sort_order=item.sort_order,
        created_at=item.created_at,
    )


def build_evidence_item(item, *, user_display_map: dict[int, str] | None = None) -> TechDocsEvidenceItemResponse:
    user_display_map = user_display_map or {}
    return TechDocsEvidenceItemResponse(
        id=item.id,
        dossier_id=item.dossier_id,
        evidence_kind=item.evidence_kind,
        file_name=item.file_name,
        content_type=item.content_type,
        file_size=item.file_size,
        description=item.description,
        uploaded_by_user_id=item.uploaded_by_user_id,
        uploaded_by_display_name=user_display_map.get(item.uploaded_by_user_id),
        created_at=item.created_at,
    )


def build_audit_event_item(item, *, user_display_map: dict[int, str] | None = None) -> TechDocsAuditEventItemResponse:
    user_display_map = user_display_map or {}
    return TechDocsAuditEventItemResponse(
        id=item.id,
        dossier_id=item.dossier_id,
        event_type=item.event_type,
        summary=item.summary,
        payload_json=item.payload_json,
        created_by_user_id=item.created_by_user_id,
        created_by_display_name=user_display_map.get(item.created_by_user_id),
        created_at=item.created_at,
    )
