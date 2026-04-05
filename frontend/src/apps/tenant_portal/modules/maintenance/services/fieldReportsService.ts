import { API_BASE_URL, apiRequest } from "../../../../../services/api";
import type { ApiError, ApiErrorPayload } from "../../../../../types";

export type TenantMaintenanceFieldReportChecklistItem = {
  id: number | null;
  work_order_id: number | null;
  item_key: string;
  label: string;
  is_completed: boolean;
  notes: string | null;
  sort_order: number;
  updated_by_user_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TenantMaintenanceWorkOrderEvidence = {
  id: number;
  work_order_id: number;
  file_name: string;
  content_type: string | null;
  file_size: number;
  notes: string | null;
  uploaded_by_user_id: number | null;
  created_at: string;
};

export type TenantMaintenanceFieldReport = {
  work_order_id: number;
  closure_notes: string | null;
  checklist_items: TenantMaintenanceFieldReportChecklistItem[];
  evidences: TenantMaintenanceWorkOrderEvidence[];
};

export type TenantMaintenanceFieldReportResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceFieldReport;
};

export type TenantMaintenanceFieldReportUpdateRequest = {
  closure_notes: string | null;
  checklist_items: Array<{
    item_key: string;
    label: string;
    is_completed: boolean;
    notes: string | null;
  }>;
};

export type TenantMaintenanceWorkOrderEvidenceMutationResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceWorkOrderEvidence;
};

export function getTenantMaintenanceFieldReport(
  accessToken: string,
  workOrderId: number
) {
  return apiRequest<TenantMaintenanceFieldReportResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/field-report`,
    { token: accessToken }
  );
}

export function updateTenantMaintenanceFieldReport(
  accessToken: string,
  workOrderId: number,
  payload: TenantMaintenanceFieldReportUpdateRequest
) {
  return apiRequest<TenantMaintenanceFieldReportResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/field-report`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function uploadTenantMaintenanceWorkOrderEvidence(
  accessToken: string,
  workOrderId: number,
  file: File,
  notes?: string
) {
  const body = new FormData();
  body.append("file", file);
  if (notes?.trim()) {
    body.append("notes", notes.trim());
  }
  return apiRequest<TenantMaintenanceWorkOrderEvidenceMutationResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/evidences`,
    {
      method: "POST",
      token: accessToken,
      body,
    }
  );
}

export function deleteTenantMaintenanceWorkOrderEvidence(
  accessToken: string,
  workOrderId: number,
  evidenceId: number
) {
  return apiRequest<{ success: boolean; message: string; data: { evidence_id: number; work_order_id: number } }>(
    `/tenant/maintenance/work-orders/${workOrderId}/evidences/${evidenceId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}

export async function downloadTenantMaintenanceWorkOrderEvidence(
  accessToken: string,
  workOrderId: number,
  evidenceId: number
) {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/tenant/maintenance/work-orders/${workOrderId}/evidences/${evidenceId}/download`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  } catch {
    const error = new Error(
      `No se pudo conectar con la API en ${API_BASE_URL}. Revisa VITE_API_BASE_URL, CORS y que el backend esté levantado.`
    ) as ApiError;
    error.payload = {
      detail:
        `No se pudo conectar con la API en ${API_BASE_URL}. ` +
        "Revisa VITE_API_BASE_URL, CORS y que el backend esté levantado.",
      error_type: "network_error",
    };
    throw error;
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }
    const error = new Error(
      payload?.detail || `Request failed with status ${response.status}`
    ) as ApiError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get("content-type"),
  };
}