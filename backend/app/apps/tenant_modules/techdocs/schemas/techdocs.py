from datetime import datetime

from pydantic import BaseModel

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class TechDocsDossierStatusUpdateRequest(BaseModel):
    status: str
    notes: str | None = None


class TechDocsDossierCreateRequest(BaseModel):
    client_id: int | None = None
    site_id: int | None = None
    installation_id: int | None = None
    opportunity_id: int | None = None
    work_order_id: int | None = None
    task_id: int | None = None
    owner_user_id: int | None = None
    title: str
    dossier_type: str = "custom"
    status: str = "draft"
    summary: str | None = None
    objective: str | None = None
    scope_notes: str | None = None
    technical_notes: str | None = None
    is_active: bool = True


class TechDocsSectionWriteRequest(BaseModel):
    section_kind: str = "custom"
    title: str
    notes: str | None = None
    sort_order: int = 100


class TechDocsMeasurementWriteRequest(BaseModel):
    label: str
    measured_value: str | None = None
    unit: str | None = None
    expected_range: str | None = None
    notes: str | None = None
    sort_order: int = 100


class TechDocsAuditEventItemResponse(BaseModel):
    id: int
    dossier_id: int
    event_type: str
    summary: str | None = None
    payload_json: str | None = None
    created_by_user_id: int | None = None
    created_by_display_name: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class TechDocsEvidenceItemResponse(BaseModel):
    id: int
    dossier_id: int
    evidence_kind: str
    file_name: str
    content_type: str | None = None
    file_size: int
    description: str | None = None
    uploaded_by_user_id: int | None = None
    uploaded_by_display_name: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class TechDocsMeasurementItemResponse(BaseModel):
    id: int
    dossier_id: int
    section_id: int
    label: str
    measured_value: str | None = None
    unit: str | None = None
    expected_range: str | None = None
    notes: str | None = None
    sort_order: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class TechDocsSectionItemResponse(BaseModel):
    id: int
    dossier_id: int
    section_kind: str
    title: str
    notes: str | None = None
    sort_order: int
    created_at: datetime | None = None
    measurements: list[TechDocsMeasurementItemResponse]

    class Config:
        from_attributes = True


class TechDocsDossierItemResponse(BaseModel):
    id: int
    client_id: int | None = None
    client_display_name: str | None = None
    site_id: int | None = None
    site_display_name: str | None = None
    installation_id: int | None = None
    installation_display_name: str | None = None
    opportunity_id: int | None = None
    opportunity_title: str | None = None
    work_order_id: int | None = None
    work_order_title: str | None = None
    task_id: int | None = None
    task_title: str | None = None
    owner_user_id: int | None = None
    owner_user_display_name: str | None = None
    title: str
    dossier_type: str
    status: str
    summary: str | None = None
    objective: str | None = None
    scope_notes: str | None = None
    technical_notes: str | None = None
    version: int
    approved_by_user_id: int | None = None
    approved_by_display_name: str | None = None
    approved_at: datetime | None = None
    is_active: bool
    created_by_user_id: int | None = None
    created_by_display_name: str | None = None
    updated_by_user_id: int | None = None
    updated_by_display_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class TechDocsDossierDetailItemResponse(BaseModel):
    dossier: TechDocsDossierItemResponse
    sections: list[TechDocsSectionItemResponse]
    evidences: list[TechDocsEvidenceItemResponse]
    audit_events: list[TechDocsAuditEventItemResponse]


class TechDocsDossierMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: TechDocsDossierItemResponse


class TechDocsSectionMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    detail: TechDocsDossierDetailItemResponse


class TechDocsMeasurementMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    detail: TechDocsDossierDetailItemResponse


class TechDocsEvidenceMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    detail: TechDocsDossierDetailItemResponse


class TechDocsDossierDetailResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: TechDocsDossierDetailItemResponse


class TechDocsDossiersResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[TechDocsDossierItemResponse]


class TechDocsAuditResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[TechDocsAuditEventItemResponse]


class TechDocsOverviewMetricsResponse(BaseModel):
    active_total: int
    review_total: int
    approved_total: int
    archived_total: int
    evidence_total: int


class TechDocsModuleOverviewResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    metrics: TechDocsOverviewMetricsResponse
    recent_dossiers: list[TechDocsDossierItemResponse]
    recent_evidences: list[TechDocsEvidenceItemResponse]
