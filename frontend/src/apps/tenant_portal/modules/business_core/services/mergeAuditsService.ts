import { apiRequest } from "../../../../../services/api";

export type TenantBusinessCoreMergeAudit = {
  id: number;
  entity_kind: string;
  entity_id: number;
  summary: string;
  payload: Record<string, unknown> | null;
  requested_by_user_id: number | null;
  requested_by_email: string | null;
  requested_by_role: string | null;
  created_at: string;
};

export type TenantBusinessCoreMergeAuditCreateRequest = {
  entity_kind: string;
  entity_id: number;
  summary: string;
  payload: Record<string, unknown> | null;
};

export type TenantBusinessCoreMergeAuditMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessCoreMergeAudit;
};

export type TenantBusinessCoreMergeAuditsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessCoreMergeAudit[];
};

export function createTenantBusinessCoreMergeAudit(
  accessToken: string,
  payload: TenantBusinessCoreMergeAuditCreateRequest
) {
  return apiRequest<TenantBusinessCoreMergeAuditMutationResponse>(
    "/tenant/business-core/merge-audits",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function getTenantBusinessCoreMergeAudits(
  accessToken: string,
  options: { entityKind?: string; entityId?: number; limit?: number } = {}
) {
  const params = new URLSearchParams();
  if (options.entityKind) {
    params.set("entity_kind", options.entityKind);
  }
  if (options.entityId !== undefined) {
    params.set("entity_id", String(options.entityId));
  }
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  return apiRequest<TenantBusinessCoreMergeAuditsResponse>(
    `/tenant/business-core/merge-audits${params.toString() ? `?${params.toString()}` : ""}`,
    { token: accessToken }
  );
}
