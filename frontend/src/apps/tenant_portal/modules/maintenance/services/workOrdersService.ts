import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceWorkOrder = {
  id: number;
  client_id: number;
  site_id: number;
  installation_id: number | null;
  task_type_id: number | null;
  schedule_id: number | null;
  due_item_id: number | null;
  billing_mode: string | null;
  assigned_work_group_id: number | null;
  external_reference: string | null;
  title: string;
  description: string | null;
  priority: string;
  scheduled_for: string | null;
  cancellation_reason: string | null;
  closure_notes: string | null;
  assigned_tenant_user_id: number | null;
  maintenance_status: string;
  requested_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceWorkOrdersResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceWorkOrder[];
};

export type TenantMaintenanceWorkOrderMutationResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceWorkOrder;
};

export type TenantMaintenanceWorkOrderWriteRequest = {
  client_id: number;
  site_id: number;
  installation_id: number | null;
  task_type_id: number | null;
  assigned_work_group_id: number | null;
  external_reference: string | null;
  title: string;
  description: string | null;
  priority: string;
  scheduled_for: string | null;
  cancellation_reason: string | null;
  closure_notes: string | null;
  reschedule_note?: string | null;
  completed_at_override?: string | null;
  closure_adjustment_note?: string | null;
  assigned_tenant_user_id: number | null;
  maintenance_status?: string;
};

export type TenantMaintenanceStatusFinanceSyncRequest = {
  sync_income: boolean;
  sync_expense: boolean;
  income_account_id: number | null;
  expense_account_id: number | null;
  income_category_id: number | null;
  expense_category_id: number | null;
  currency_id: number;
  transaction_at: string | null;
  income_description: string | null;
  expense_description: string | null;
  notes: string | null;
};

export function getTenantMaintenanceWorkOrders(
  accessToken: string,
  options: {
    clientId?: number;
    siteId?: number;
    installationId?: number;
    maintenanceStatus?: string;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.clientId !== undefined) {
    params.set("client_id", String(options.clientId));
  }
  if (options.siteId !== undefined) {
    params.set("site_id", String(options.siteId));
  }
  if (options.installationId !== undefined) {
    params.set("installation_id", String(options.installationId));
  }
  if (options.maintenanceStatus) {
    params.set("maintenance_status", options.maintenanceStatus);
  }
  const suffix = params.toString();
  return apiRequest<TenantMaintenanceWorkOrdersResponse>(
    `/tenant/maintenance/work-orders${suffix ? `?${suffix}` : ""}`,
    { token: accessToken }
  );
}

export function createTenantMaintenanceWorkOrder(
  accessToken: string,
  payload: TenantMaintenanceWorkOrderWriteRequest
) {
  return apiRequest<TenantMaintenanceWorkOrderMutationResponse>(
    "/tenant/maintenance/work-orders",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceWorkOrder(
  accessToken: string,
  workOrderId: number,
  payload: TenantMaintenanceWorkOrderWriteRequest
) {
  return apiRequest<TenantMaintenanceWorkOrderMutationResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceWorkOrderStatus(
  accessToken: string,
  workOrderId: number,
  maintenanceStatus: string,
  note: string | null = null,
  financeSync: TenantMaintenanceStatusFinanceSyncRequest | null = null
) {
  return apiRequest<TenantMaintenanceWorkOrderMutationResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: {
        maintenance_status: maintenanceStatus,
        note,
        finance_sync: financeSync,
      },
    }
  );
}

export function deleteTenantMaintenanceWorkOrder(
  accessToken: string,
  workOrderId: number
) {
  return apiRequest<TenantMaintenanceWorkOrderMutationResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
