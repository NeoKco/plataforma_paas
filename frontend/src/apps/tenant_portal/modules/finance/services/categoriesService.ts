import { apiRequest } from "../../../../../services/api";

export type TenantFinanceCategory = {
  id: number;
  name: string;
  category_type: string;
  parent_category_id: number | null;
  icon: string | null;
  color: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceCategoriesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceCategory[];
};

export type TenantFinanceCategoryMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceCategory;
};

export type TenantFinanceCategoryWriteRequest = {
  name: string;
  category_type: string;
  parent_category_id: number | null;
  icon: string | null;
  color: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantFinanceCategories(
  accessToken: string,
  options: { includeInactive?: boolean; categoryType?: string } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  if (options.categoryType) {
    params.set("category_type", options.categoryType);
  }
  return apiRequest<TenantFinanceCategoriesResponse>(
    `/tenant/finance/categories?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantFinanceCategory(
  accessToken: string,
  payload: TenantFinanceCategoryWriteRequest
) {
  return apiRequest<TenantFinanceCategoryMutationResponse>("/tenant/finance/categories", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceCategory(
  accessToken: string,
  categoryId: number,
  payload: TenantFinanceCategoryWriteRequest
) {
  return apiRequest<TenantFinanceCategoryMutationResponse>(
    `/tenant/finance/categories/${categoryId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantFinanceCategoryStatus(
  accessToken: string,
  categoryId: number,
  isActive: boolean
) {
  return apiRequest<TenantFinanceCategoryMutationResponse>(
    `/tenant/finance/categories/${categoryId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}

export function deleteTenantFinanceCategory(accessToken: string, categoryId: number) {
  return apiRequest<TenantFinanceCategoryMutationResponse>(
    `/tenant/finance/categories/${categoryId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
