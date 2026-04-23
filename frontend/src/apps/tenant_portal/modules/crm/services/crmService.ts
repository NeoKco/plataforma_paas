import { apiDownload, apiRequest } from "../../../../../services/api";

export type CRMRequestedBy = {
  user_id: number;
  email: string;
  role: string;
  tenant_slug: string;
  token_scope: string;
};

export type CRMProductCharacteristic = {
  id: number | null;
  product_id?: number;
  label: string;
  value: string;
  sort_order: number;
  created_at?: string | null;
};

export type CRMProduct = {
  id: number;
  sku: string | null;
  name: string;
  product_type: string;
  unit_label: string | null;
  unit_price: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  characteristics: CRMProductCharacteristic[];
};

export type CRMProductWriteRequest = {
  sku: string | null;
  name: string;
  product_type: string;
  unit_label: string | null;
  unit_price: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  characteristics: CRMProductCharacteristic[];
};

export type CRMOpportunity = {
  id: number;
  client_id: number | null;
  client_display_name: string | null;
  title: string;
  stage: string;
  owner_user_id: number | null;
  expected_value: number | null;
  probability_percent: number;
  expected_close_at: string | null;
  source_channel: string | null;
  summary: string | null;
  next_step: string | null;
  closed_at: string | null;
  close_reason: string | null;
  close_notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type CRMOpportunityWriteRequest = {
  client_id: number | null;
  title: string;
  stage: string;
  owner_user_id: number | null;
  expected_value: number | null;
  probability_percent: number;
  expected_close_at: string | null;
  source_channel: string | null;
  summary: string | null;
  next_step: string | null;
  is_active: boolean;
  sort_order: number;
};

export type CRMOpportunityCloseRequest = {
  final_stage: string;
  close_reason: string | null;
  close_notes: string | null;
};

export type CRMOpportunityContact = {
  id: number;
  opportunity_id: number;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string | null;
};

export type CRMOpportunityContactWriteRequest = {
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  sort_order: number;
};

export type CRMOpportunityNote = {
  id: number;
  opportunity_id: number;
  note: string;
  created_by_user_id: number | null;
  created_at: string | null;
};

export type CRMOpportunityNoteWriteRequest = {
  note: string;
};

export type CRMOpportunityActivity = {
  id: number;
  opportunity_id: number;
  activity_type: string;
  description: string | null;
  scheduled_at: string | null;
  status: string;
  created_by_user_id: number | null;
  completed_at: string | null;
  created_at: string | null;
};

export type CRMOpportunityActivityWriteRequest = {
  activity_type: string;
  description: string | null;
  scheduled_at: string | null;
  status: string;
};

export type CRMOpportunityAttachment = {
  id: number;
  opportunity_id: number;
  file_name: string;
  content_type: string | null;
  file_size: number;
  notes: string | null;
  uploaded_by_user_id: number | null;
  created_at: string | null;
};

export type CRMOpportunityStageEvent = {
  id: number;
  opportunity_id: number;
  event_type: string;
  from_stage: string | null;
  to_stage: string | null;
  summary: string | null;
  notes: string | null;
  created_by_user_id: number | null;
  created_at: string | null;
};

export type CRMOpportunityDetail = {
  opportunity: CRMOpportunity;
  contacts: CRMOpportunityContact[];
  notes: CRMOpportunityNote[];
  activities: CRMOpportunityActivity[];
  attachments: CRMOpportunityAttachment[];
  stage_events: CRMOpportunityStageEvent[];
};

export type CRMOpportunityKanbanColumn = {
  stage: string;
  total: number;
  stage_value: number;
  items: CRMOpportunity[];
};

export type CRMQuoteLine = {
  id: number | null;
  product_id: number | null;
  product_name?: string | null;
  section_id?: number | null;
  line_type: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
};

export type CRMQuoteSection = {
  id: number | null;
  quote_id?: number;
  title: string;
  description: string | null;
  sort_order: number;
  lines: CRMQuoteLine[];
};

export type CRMQuote = {
  id: number;
  client_id: number | null;
  client_display_name: string | null;
  opportunity_id: number | null;
  opportunity_title: string | null;
  template_id: number | null;
  template_name: string | null;
  quote_number: string | null;
  title: string;
  quote_status: string;
  valid_until: string | null;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  summary: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  lines: CRMQuoteLine[];
  sections: CRMQuoteSection[];
};

export type CRMQuoteWriteRequest = {
  client_id: number | null;
  opportunity_id: number | null;
  template_id: number | null;
  quote_number: string | null;
  title: string;
  quote_status: string;
  valid_until: string | null;
  discount_amount: number;
  tax_amount: number;
  summary: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  lines: CRMQuoteLine[];
  sections: CRMQuoteSection[];
};

export type CRMQuoteTemplateItem = {
  id: number | null;
  section_id?: number;
  product_id: number | null;
  product_name?: string | null;
  line_type: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  sort_order: number;
};

export type CRMQuoteTemplateSection = {
  id: number | null;
  template_id?: number;
  title: string;
  description: string | null;
  sort_order: number;
  items: CRMQuoteTemplateItem[];
};

export type CRMQuoteTemplate = {
  id: number;
  name: string;
  summary: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  sections: CRMQuoteTemplateSection[];
};

export type CRMQuoteTemplateWriteRequest = {
  name: string;
  summary: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  sections: CRMQuoteTemplateSection[];
};

type CRMProductsResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  total: number;
  data: CRMProduct[];
};

type CRMProductMutationResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  data: CRMProduct;
};

type CRMOpportunitiesResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  total: number;
  pipeline_value: number;
  data: CRMOpportunity[];
};

type CRMOpportunityMutationResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  data: CRMOpportunity;
};

type CRMOpportunityDetailResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  data: CRMOpportunityDetail;
};

type CRMOpportunityKanbanResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  columns: CRMOpportunityKanbanColumn[];
};

type CRMOpportunitySubresourceMutationResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  data: Record<string, unknown>;
};

type CRMQuotesResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  total: number;
  quoted_amount: number;
  data: CRMQuote[];
};

type CRMQuoteMutationResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  data: CRMQuote;
};

type CRMQuoteTemplatesResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  total: number;
  data: CRMQuoteTemplate[];
};

type CRMQuoteTemplateMutationResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  data: CRMQuoteTemplate;
};

export type CRMOverviewResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  metrics: {
    products_total: number;
    products_active: number;
    opportunities_total: number;
    opportunities_open: number;
    opportunities_historical: number;
    pipeline_value: number;
    quotes_total: number;
    quoted_amount: number;
    templates_total: number;
  };
  recent_opportunities: CRMOpportunity[];
  recent_quotes: CRMQuote[];
};

export function getCRMOverview(accessToken: string) {
  return apiRequest<CRMOverviewResponse>("/tenant/crm/overview", {
    token: accessToken,
  });
}

export function getCRMProducts(accessToken: string) {
  return apiRequest<CRMProductsResponse>("/tenant/crm/products", {
    token: accessToken,
  });
}

export function createCRMProduct(accessToken: string, payload: CRMProductWriteRequest) {
  return apiRequest<CRMProductMutationResponse>("/tenant/crm/products", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMProduct(accessToken: string, productId: number, payload: CRMProductWriteRequest) {
  return apiRequest<CRMProductMutationResponse>(`/tenant/crm/products/${productId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMProductStatus(accessToken: string, productId: number, isActive: boolean) {
  return apiRequest<CRMProductMutationResponse>(`/tenant/crm/products/${productId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteCRMProduct(accessToken: string, productId: number) {
  return apiRequest<CRMProductMutationResponse>(`/tenant/crm/products/${productId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function getCRMOpportunities(accessToken: string) {
  return apiRequest<CRMOpportunitiesResponse>("/tenant/crm/opportunities", {
    token: accessToken,
  });
}

export function getCRMOpportunityKanban(accessToken: string) {
  return apiRequest<CRMOpportunityKanbanResponse>("/tenant/crm/opportunities/kanban", {
    token: accessToken,
  });
}

export function getCRMHistoricalOpportunities(accessToken: string) {
  return apiRequest<CRMOpportunitiesResponse>("/tenant/crm/opportunities/historical", {
    token: accessToken,
  });
}

export function getCRMOpportunityDetail(accessToken: string, opportunityId: number) {
  return apiRequest<CRMOpportunityDetailResponse>(`/tenant/crm/opportunities/${opportunityId}/detail`, {
    token: accessToken,
  });
}

export function createCRMOpportunity(accessToken: string, payload: CRMOpportunityWriteRequest) {
  return apiRequest<CRMOpportunityMutationResponse>("/tenant/crm/opportunities", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMOpportunity(accessToken: string, opportunityId: number, payload: CRMOpportunityWriteRequest) {
  return apiRequest<CRMOpportunityMutationResponse>(`/tenant/crm/opportunities/${opportunityId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function closeCRMOpportunity(accessToken: string, opportunityId: number, payload: CRMOpportunityCloseRequest) {
  return apiRequest<CRMOpportunityMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/close`, {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMOpportunityStatus(accessToken: string, opportunityId: number, isActive: boolean) {
  return apiRequest<CRMOpportunityMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteCRMOpportunity(accessToken: string, opportunityId: number) {
  return apiRequest<CRMOpportunityMutationResponse>(`/tenant/crm/opportunities/${opportunityId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function createCRMOpportunityContact(accessToken: string, opportunityId: number, payload: CRMOpportunityContactWriteRequest) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/contacts`, {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMOpportunityContact(accessToken: string, opportunityId: number, contactId: number, payload: CRMOpportunityContactWriteRequest) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/contacts/${contactId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function deleteCRMOpportunityContact(accessToken: string, opportunityId: number, contactId: number) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/contacts/${contactId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function createCRMOpportunityNote(accessToken: string, opportunityId: number, payload: CRMOpportunityNoteWriteRequest) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/notes`, {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMOpportunityNote(accessToken: string, opportunityId: number, noteId: number, payload: CRMOpportunityNoteWriteRequest) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/notes/${noteId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function deleteCRMOpportunityNote(accessToken: string, opportunityId: number, noteId: number) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/notes/${noteId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function createCRMOpportunityActivity(accessToken: string, opportunityId: number, payload: CRMOpportunityActivityWriteRequest) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/activities`, {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMOpportunityActivity(accessToken: string, opportunityId: number, activityId: number, payload: CRMOpportunityActivityWriteRequest) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/activities/${activityId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMOpportunityActivityStatus(accessToken: string, opportunityId: number, activityId: number, status: string) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/activities/${activityId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { status },
  });
}

export function deleteCRMOpportunityActivity(accessToken: string, opportunityId: number, activityId: number) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/activities/${activityId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function uploadCRMOpportunityAttachment(accessToken: string, opportunityId: number, file: File, notes?: string) {
  const body = new FormData();
  body.append("file", file);
  if (notes?.trim()) {
    body.append("notes", notes.trim());
  }
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/attachments`, {
    method: "POST",
    token: accessToken,
    body,
  });
}

export function deleteCRMOpportunityAttachment(accessToken: string, opportunityId: number, attachmentId: number) {
  return apiRequest<CRMOpportunitySubresourceMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/attachments/${attachmentId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function downloadCRMOpportunityAttachment(accessToken: string, opportunityId: number, attachmentId: number) {
  return apiDownload(`/tenant/crm/opportunities/${opportunityId}/attachments/${attachmentId}/download`, {
    token: accessToken,
  });
}

export function getCRMQuotes(accessToken: string) {
  return apiRequest<CRMQuotesResponse>("/tenant/crm/quotes", {
    token: accessToken,
  });
}

export function createCRMQuote(accessToken: string, payload: CRMQuoteWriteRequest) {
  return apiRequest<CRMQuoteMutationResponse>("/tenant/crm/quotes", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMQuote(accessToken: string, quoteId: number, payload: CRMQuoteWriteRequest) {
  return apiRequest<CRMQuoteMutationResponse>(`/tenant/crm/quotes/${quoteId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMQuoteStatus(accessToken: string, quoteId: number, isActive: boolean) {
  return apiRequest<CRMQuoteMutationResponse>(`/tenant/crm/quotes/${quoteId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteCRMQuote(accessToken: string, quoteId: number) {
  return apiRequest<CRMQuoteMutationResponse>(`/tenant/crm/quotes/${quoteId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function getCRMQuoteTemplates(accessToken: string) {
  return apiRequest<CRMQuoteTemplatesResponse>("/tenant/crm/templates", {
    token: accessToken,
  });
}

export function createCRMQuoteTemplate(accessToken: string, payload: CRMQuoteTemplateWriteRequest) {
  return apiRequest<CRMQuoteTemplateMutationResponse>("/tenant/crm/templates", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMQuoteTemplate(accessToken: string, templateId: number, payload: CRMQuoteTemplateWriteRequest) {
  return apiRequest<CRMQuoteTemplateMutationResponse>(`/tenant/crm/templates/${templateId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMQuoteTemplateStatus(accessToken: string, templateId: number, isActive: boolean) {
  return apiRequest<CRMQuoteTemplateMutationResponse>(`/tenant/crm/templates/${templateId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteCRMQuoteTemplate(accessToken: string, templateId: number) {
  return apiRequest<CRMQuoteTemplateMutationResponse>(`/tenant/crm/templates/${templateId}`, {
    method: "DELETE",
    token: accessToken,
  });
}
