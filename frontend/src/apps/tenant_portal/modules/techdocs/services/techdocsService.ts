import { apiDownload, apiRequest } from "../../../../../services/api";

export type TechDocsRequestedBy = {
  user_id: number;
  email: string;
  role: string;
  tenant_slug: string;
  token_scope: string;
};

export type TechDocsDossier = {
  id: number;
  client_id: number | null;
  client_display_name: string | null;
  site_id: number | null;
  site_display_name: string | null;
  installation_id: number | null;
  installation_display_name: string | null;
  opportunity_id: number | null;
  opportunity_title: string | null;
  work_order_id: number | null;
  work_order_title: string | null;
  task_id: number | null;
  task_title: string | null;
  owner_user_id: number | null;
  owner_user_display_name: string | null;
  title: string;
  dossier_type: string;
  status: string;
  summary: string | null;
  objective: string | null;
  scope_notes: string | null;
  technical_notes: string | null;
  version: number;
  approved_by_user_id: number | null;
  approved_by_display_name: string | null;
  approved_at: string | null;
  is_active: boolean;
  created_by_user_id: number | null;
  created_by_display_name: string | null;
  updated_by_user_id: number | null;
  updated_by_display_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TechDocsSection = {
  id: number;
  dossier_id: number;
  section_kind: string;
  title: string;
  notes: string | null;
  sort_order: number;
  created_at: string | null;
  measurements: TechDocsMeasurement[];
};

export type TechDocsMeasurement = {
  id: number;
  dossier_id: number;
  section_id: number;
  label: string;
  measured_value: string | null;
  unit: string | null;
  expected_range: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string | null;
};

export type TechDocsEvidence = {
  id: number;
  dossier_id: number;
  evidence_kind: string;
  file_name: string;
  content_type: string | null;
  file_size: number;
  description: string | null;
  uploaded_by_user_id: number | null;
  uploaded_by_display_name: string | null;
  created_at: string | null;
};

export type TechDocsAuditEvent = {
  id: number;
  dossier_id: number;
  event_type: string;
  summary: string | null;
  payload_json: string | null;
  created_by_user_id: number | null;
  created_by_display_name: string | null;
  created_at: string | null;
};

export type TechDocsDossierDetail = {
  dossier: TechDocsDossier;
  sections: TechDocsSection[];
  evidences: TechDocsEvidence[];
  audit_events: TechDocsAuditEvent[];
};

export type TechDocsDossierWriteRequest = {
  client_id: number | null;
  site_id: number | null;
  installation_id: number | null;
  opportunity_id: number | null;
  work_order_id: number | null;
  task_id: number | null;
  owner_user_id: number | null;
  title: string;
  dossier_type: string;
  status: string;
  summary: string | null;
  objective: string | null;
  scope_notes: string | null;
  technical_notes: string | null;
  is_active: boolean;
};

export type TechDocsSectionWriteRequest = {
  section_kind: string;
  title: string;
  notes: string | null;
  sort_order: number;
};

export type TechDocsMeasurementWriteRequest = {
  label: string;
  measured_value: string | null;
  unit: string | null;
  expected_range: string | null;
  notes: string | null;
  sort_order: number;
};

type TechDocsOverviewResponse = {
  success: boolean;
  message: string;
  requested_by: TechDocsRequestedBy;
  metrics: {
    active_total: number;
    review_total: number;
    approved_total: number;
    archived_total: number;
    evidence_total: number;
  };
  recent_dossiers: TechDocsDossier[];
  recent_evidences: TechDocsEvidence[];
};

type TechDocsDossiersResponse = {
  success: boolean;
  message: string;
  requested_by: TechDocsRequestedBy;
  total: number;
  data: TechDocsDossier[];
};

type TechDocsDossierDetailResponse = {
  success: boolean;
  message: string;
  requested_by: TechDocsRequestedBy;
  data: TechDocsDossierDetail;
};

type TechDocsDossierMutationResponse = {
  success: boolean;
  message: string;
  requested_by: TechDocsRequestedBy;
  data: TechDocsDossier;
};

type TechDocsSubresourceMutationResponse = {
  success: boolean;
  message: string;
  requested_by: TechDocsRequestedBy;
  detail: TechDocsDossierDetail;
};

type TechDocsAuditResponse = {
  success: boolean;
  message: string;
  requested_by: TechDocsRequestedBy;
  total: number;
  data: TechDocsAuditEvent[];
};

export function getTechDocsOverview(accessToken: string) {
  return apiRequest<TechDocsOverviewResponse>("/tenant/techdocs/overview", {
    token: accessToken,
  });
}

export function getTechDocsDossiers(
  accessToken: string,
  options: {
    includeInactive?: boolean;
    includeArchived?: boolean;
    status?: string;
    dossierType?: string;
    clientId?: number;
    installationId?: number;
    q?: string;
  } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  params.set("include_archived", options.includeArchived === false ? "false" : "true");
  if (options.status) params.set("status", options.status);
  if (options.dossierType) params.set("dossier_type", options.dossierType);
  if (options.clientId !== undefined) params.set("client_id", String(options.clientId));
  if (options.installationId !== undefined) {
    params.set("installation_id", String(options.installationId));
  }
  if (options.q?.trim()) params.set("q", options.q.trim());
  return apiRequest<TechDocsDossiersResponse>(
    `/tenant/techdocs/dossiers?${params.toString()}`,
    { token: accessToken }
  );
}

export function getTechDocsDossierDetail(accessToken: string, dossierId: number) {
  return apiRequest<TechDocsDossierDetailResponse>(
    `/tenant/techdocs/dossiers/${dossierId}/detail`,
    { token: accessToken }
  );
}

export function createTechDocsDossier(
  accessToken: string,
  payload: TechDocsDossierWriteRequest
) {
  return apiRequest<TechDocsDossierMutationResponse>("/tenant/techdocs/dossiers", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTechDocsDossier(
  accessToken: string,
  dossierId: number,
  payload: TechDocsDossierWriteRequest
) {
  return apiRequest<TechDocsDossierMutationResponse>(
    `/tenant/techdocs/dossiers/${dossierId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTechDocsDossierStatus(
  accessToken: string,
  dossierId: number,
  status: string,
  notes: string | null
) {
  return apiRequest<TechDocsDossierMutationResponse>(
    `/tenant/techdocs/dossiers/${dossierId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { status, notes },
    }
  );
}

export function deleteTechDocsDossier(accessToken: string, dossierId: number) {
  return apiRequest<TechDocsDossierMutationResponse>(
    `/tenant/techdocs/dossiers/${dossierId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}

export function createTechDocsSection(
  accessToken: string,
  dossierId: number,
  payload: TechDocsSectionWriteRequest
) {
  return apiRequest<TechDocsSubresourceMutationResponse>(
    `/tenant/techdocs/dossiers/${dossierId}/sections`,
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTechDocsSection(
  accessToken: string,
  sectionId: number,
  payload: TechDocsSectionWriteRequest
) {
  return apiRequest<TechDocsSubresourceMutationResponse>(
    `/tenant/techdocs/dossiers/sections/${sectionId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function deleteTechDocsSection(accessToken: string, sectionId: number) {
  return apiRequest<TechDocsSubresourceMutationResponse>(
    `/tenant/techdocs/dossiers/sections/${sectionId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}

export function createTechDocsMeasurement(
  accessToken: string,
  sectionId: number,
  payload: TechDocsMeasurementWriteRequest
) {
  return apiRequest<TechDocsSubresourceMutationResponse>(
    `/tenant/techdocs/dossiers/sections/${sectionId}/measurements`,
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTechDocsMeasurement(
  accessToken: string,
  measurementId: number,
  payload: TechDocsMeasurementWriteRequest
) {
  return apiRequest<TechDocsSubresourceMutationResponse>(
    `/tenant/techdocs/dossiers/measurements/${measurementId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function deleteTechDocsMeasurement(accessToken: string, measurementId: number) {
  return apiRequest<TechDocsSubresourceMutationResponse>(
    `/tenant/techdocs/dossiers/measurements/${measurementId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}

export function uploadTechDocsEvidence(
  accessToken: string,
  dossierId: number,
  payload: {
    file: File;
    evidenceKind: string;
    description: string | null;
  }
) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("evidence_kind", payload.evidenceKind);
  if (payload.description?.trim()) {
    formData.append("description", payload.description.trim());
  }
  return apiRequest<TechDocsSubresourceMutationResponse>(
    `/tenant/techdocs/dossiers/${dossierId}/evidences`,
    {
      method: "POST",
      token: accessToken,
      body: formData,
    }
  );
}

export function deleteTechDocsEvidence(
  accessToken: string,
  dossierId: number,
  evidenceId: number
) {
  return apiRequest<TechDocsSubresourceMutationResponse>(
    `/tenant/techdocs/dossiers/${dossierId}/evidences/${evidenceId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}

export async function downloadTechDocsEvidence(
  accessToken: string,
  dossierId: number,
  evidenceId: number
) {
  const result = await apiDownload(
    `/tenant/techdocs/dossiers/${dossierId}/evidences/${evidenceId}/download`,
    {
      token: accessToken,
    }
  );
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.fileName || `techdocs-evidence-${evidenceId}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function getTechDocsAudit(
  accessToken: string,
  options: { dossierId?: number; q?: string } = {}
) {
  const params = new URLSearchParams();
  if (options.dossierId !== undefined) params.set("dossier_id", String(options.dossierId));
  if (options.q?.trim()) params.set("q", options.q.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<TechDocsAuditResponse>(`/tenant/techdocs/audit${suffix}`, {
    token: accessToken,
  });
}
