import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import { BusinessCoreHelpBubble } from "../components/common/BusinessCoreHelpBubble";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  deleteTenantBusinessClient,
  getTenantBusinessClients,
  type TenantBusinessClient,
  updateTenantBusinessClient,
  updateTenantBusinessClientStatus,
} from "../services/clientsService";
import {
  deleteTenantBusinessContact,
  getTenantBusinessContacts,
  type TenantBusinessContact,
  updateTenantBusinessContact,
  updateTenantBusinessContactStatus,
} from "../services/contactsService";
import {
  deleteTenantBusinessOrganization,
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
  updateTenantBusinessOrganization,
  updateTenantBusinessOrganizationStatus,
} from "../services/organizationsService";
import {
  createTenantBusinessCoreMergeAudit,
  getTenantBusinessCoreMergeAudits,
  type TenantBusinessCoreMergeAudit,
} from "../services/mergeAuditsService";
import {
  deleteTenantBusinessSite,
  getTenantBusinessSites,
  type TenantBusinessSite,
  updateTenantBusinessSite,
  updateTenantBusinessSiteStatus,
} from "../services/sitesService";
import {
  getVisibleAddressLabel,
} from "../utils/addressPresentation";
import {
  deleteTenantMaintenanceInstallation,
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
  updateTenantMaintenanceInstallation,
  updateTenantMaintenanceInstallationStatus,
} from "../../maintenance/services/installationsService";
import {
  getTenantMaintenanceEquipmentTypes,
  type TenantMaintenanceEquipmentType,
} from "../../maintenance/services/equipmentTypesService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
  updateTenantMaintenanceWorkOrder,
} from "../../maintenance/services/workOrdersService";

type DuplicateEntityKind =
  | "organizations"
  | "clients"
  | "contacts"
  | "sites"
  | "installations";

type OrganizationAuditRow = {
  organization: TenantBusinessOrganization;
  client: TenantBusinessClient | null;
  contactsCount: number;
  sitesCount: number;
  workOrdersCount: number;
};

type OrganizationMergeFieldKey =
  | "name"
  | "legal_name"
  | "tax_id"
  | "phone"
  | "email"
  | "address_line"
  | "commune"
  | "city"
  | "region"
  | "country_code"
  | "notes";

type OrganizationMergeSelectionMap = Partial<Record<OrganizationMergeFieldKey, string>>;

type OrganizationMergeDiffRow = {
  field: OrganizationMergeFieldKey;
  currentValue: string | null;
  nextValue: string | null;
  sourceLabel: string | null;
  isAutomatic: boolean;
  isChanged: boolean;
};

type ClientAuditRow = {
  client: TenantBusinessClient;
  organization: TenantBusinessOrganization | null;
  primarySite: TenantBusinessSite | null;
  contactsCount: number;
  sitesCount: number;
  installationsCount: number;
  workOrdersCount: number;
};

type ClientMergeFieldKey = "service_status" | "commercial_notes";

type ClientMergeSelectionMap = Partial<Record<ClientMergeFieldKey, string>>;

type ClientMergeDiffRow = {
  field: ClientMergeFieldKey;
  currentValue: string | null;
  nextValue: string | null;
  sourceLabel: string | null;
  isAutomatic: boolean;
  isChanged: boolean;
};

type ContactAuditRow = {
  contact: TenantBusinessContact;
  organization: TenantBusinessOrganization | null;
  client: TenantBusinessClient | null;
};

type ContactMergeFieldKey =
  | "full_name"
  | "email"
  | "phone"
  | "role_title"
  | "is_primary";

type ContactMergeSelectionMap = Partial<Record<ContactMergeFieldKey, string>>;

type ContactMergeDiffRow = {
  field: ContactMergeFieldKey;
  currentValue: string | null;
  nextValue: string | null;
  sourceLabel: string | null;
  isAutomatic: boolean;
  isChanged: boolean;
};

type MergeAuditDiffRowRecord = {
  field: string;
  current_value: string | null;
  next_value: string | null;
  source_label: string | null;
  is_automatic: boolean;
  is_changed: boolean;
};

type SiteAuditRow = {
  site: TenantBusinessSite;
  client: TenantBusinessClient | null;
  organization: TenantBusinessOrganization | null;
  installationsCount: number;
  workOrdersCount: number;
};

type SiteMergeFieldKey =
  | "address_line"
  | "commune"
  | "city"
  | "region"
  | "country_code"
  | "reference_notes";

type SiteMergeSelectionMap = Partial<Record<SiteMergeFieldKey, string>>;

type SiteMergeDiffRow = {
  field: SiteMergeFieldKey;
  currentValue: string | null;
  nextValue: string | null;
  sourceLabel: string | null;
  isAutomatic: boolean;
  isChanged: boolean;
};

type InstallationAuditRow = {
  installation: TenantMaintenanceInstallation;
  site: TenantBusinessSite | null;
  client: TenantBusinessClient | null;
  organization: TenantBusinessOrganization | null;
  equipmentType: TenantMaintenanceEquipmentType | null;
  workOrdersCount: number;
};

type DuplicateGroup<T> = {
  id: string;
  kind: DuplicateEntityKind;
  titleEs: string;
  titleEn: string;
  subtitleEs: string;
  subtitleEn: string;
  searchText: string;
  members: T[];
};

const ORGANIZATION_MERGE_FIELDS: OrganizationMergeFieldKey[] = [
  "name",
  "legal_name",
  "tax_id",
  "phone",
  "email",
  "address_line",
  "commune",
  "city",
  "region",
  "country_code",
  "notes",
];

const CLIENT_MERGE_FIELDS: ClientMergeFieldKey[] = [
  "service_status",
  "commercial_notes",
];

const SITE_MERGE_FIELDS: SiteMergeFieldKey[] = [
  "address_line",
  "commune",
  "city",
  "region",
  "country_code",
  "reference_notes",
];

const CONTACT_MERGE_FIELDS: ContactMergeFieldKey[] = [
  "full_name",
  "email",
  "phone",
  "role_title",
  "is_primary",
];

function normalizeHumanKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTaxIdKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .trim();
}

function normalizeSerialKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .trim();
}

function normalizeEmailKey(value: string | null | undefined): string {
  return normalizeHumanKey(value);
}

function normalizePhoneKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^0-9]/g, "")
    .trim();
}

function getMeaningfulText(value: string | null | undefined): string | null {
  const sanitized = stripLegacyVisibleText(value ?? null)?.trim() ?? "";
  return sanitized ? sanitized : null;
}

function pickPreferredText(values: Array<string | null | undefined>): string | null {
  const candidates = values
    .map(getMeaningfulText)
    .filter((value): value is string => Boolean(value));
  if (candidates.length === 0) {
    return null;
  }
  return [...candidates].sort((left, right) => right.length - left.length || left.localeCompare(right))[0];
}

function mergeDistinctTextBlock(values: Array<string | null | undefined>): string | null {
  const deduped: string[] = [];
  const seen = new Set<string>();
  values.forEach((value) => {
    const normalized = getMeaningfulText(value);
    if (!normalized) {
      return;
    }
    const identity = normalizeHumanKey(normalized);
    if (seen.has(identity)) {
      return;
    }
    seen.add(identity);
    deduped.push(normalized);
  });
  if (deduped.length === 0) {
    return null;
  }
  return deduped.join("\n\n---\n\n");
}

function buildContactIdentityKey(contact: TenantBusinessContact): string {
  return [
    normalizeHumanKey(contact.full_name),
    normalizeEmailKey(contact.email),
    normalizePhoneKey(contact.phone),
  ].join("::");
}

function getClientName(organization: TenantBusinessOrganization | null, language: "es" | "en") {
  return (
    stripLegacyVisibleText(organization?.name) ||
    stripLegacyVisibleText(organization?.legal_name) ||
    (language === "es" ? "Cliente sin nombre" : "Unnamed client")
  );
}

function getAddressKey(site: TenantBusinessSite | null | undefined): string {
  if (!site) {
    return "";
  }
  return normalizeHumanKey(
    [site.address_line || site.name, site.commune, site.city, site.region]
      .filter(Boolean)
      .join(" | ")
  );
}

function getInstallationFallbackKey(installation: TenantMaintenanceInstallation): string {
  return normalizeHumanKey(
    [installation.name, installation.manufacturer, installation.model].filter(Boolean).join(" | ")
  );
}

function sortByMemberCount<T>(groups: DuplicateGroup<T>[]) {
  return [...groups].sort(
    (left, right) => right.members.length - left.members.length || left.id.localeCompare(right.id)
  );
}

function compareIsoDateAsc(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}

function getClientKeepScore(row: ClientAuditRow) {
  return (
    row.workOrdersCount * 1000 +
    row.installationsCount * 100 +
    row.sitesCount * 10 +
    (row.client.is_active ? 5 : 0) +
    (row.organization?.tax_id ? 2 : 0) +
    (row.primarySite ? 1 : 0)
  );
}

function getSiteKeepScore(row: SiteAuditRow) {
  return (
    row.workOrdersCount * 1000 +
    row.installationsCount * 100 +
    (row.site.is_active ? 5 : 0) +
    (row.site.address_line ? 2 : 0) +
    (row.site.reference_notes ? 1 : 0)
  );
}

function getInstallationKeepScore(row: InstallationAuditRow) {
  return (
    row.workOrdersCount * 1000 +
    (row.installation.is_active ? 5 : 0) +
    (row.installation.serial_number ? 3 : 0) +
    (row.installation.manufacturer ? 1 : 0) +
    (row.installation.model ? 1 : 0)
  );
}

function getOrganizationKeepScore(row: OrganizationAuditRow) {
  return (
    (row.client ? 1000 : 0) +
    row.workOrdersCount * 100 +
    row.sitesCount * 10 +
    row.contactsCount * 5 +
    (row.organization.is_active ? 5 : 0) +
    (row.organization.tax_id ? 4 : 0) +
    (row.organization.email ? 2 : 0) +
    (row.organization.phone ? 2 : 0) +
    (row.organization.legal_name ? 1 : 0)
  );
}

function getContactKeepScore(row: ContactAuditRow) {
  return (
    (row.contact.is_primary ? 100 : 0) +
    (row.contact.is_active ? 10 : 0) +
    (row.contact.email ? 4 : 0) +
    (row.contact.phone ? 3 : 0) +
    (row.contact.role_title ? 1 : 0)
  );
}

function getPreferredOrganizationId(group: DuplicateGroup<OrganizationAuditRow>) {
  return [...group.members]
    .sort((left, right) => {
      const scoreDiff = getOrganizationKeepScore(right) - getOrganizationKeepScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      const dateDiff = compareIsoDateAsc(
        left.organization.created_at,
        right.organization.created_at
      );
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return left.organization.id - right.organization.id;
    })[0]?.organization.id;
}

function getPreferredClientId(group: DuplicateGroup<ClientAuditRow>) {
  return [...group.members]
    .sort((left, right) => {
      const scoreDiff = getClientKeepScore(right) - getClientKeepScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      const dateDiff = compareIsoDateAsc(left.client.created_at, right.client.created_at);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return left.client.id - right.client.id;
    })[0]?.client.id;
}

function getPreferredClientRow(rows: ClientAuditRow[]) {
  return [...rows].sort((left, right) => {
    const scoreDiff = getClientKeepScore(right) - getClientKeepScore(left);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    const dateDiff = compareIsoDateAsc(left.client.created_at, right.client.created_at);
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return left.client.id - right.client.id;
  })[0] ?? null;
}

function getPreferredSiteId(group: DuplicateGroup<SiteAuditRow>) {
  return [...group.members]
    .sort((left, right) => {
      const scoreDiff = getSiteKeepScore(right) - getSiteKeepScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      const dateDiff = compareIsoDateAsc(left.site.created_at, right.site.created_at);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return left.site.id - right.site.id;
    })[0]?.site.id;
}

function getPreferredInstallationId(group: DuplicateGroup<InstallationAuditRow>) {
  return [...group.members]
    .sort((left, right) => {
      const scoreDiff = getInstallationKeepScore(right) - getInstallationKeepScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      const dateDiff = compareIsoDateAsc(
        left.installation.created_at,
        right.installation.created_at
      );
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return left.installation.id - right.installation.id;
    })[0]?.installation.id;
}

function getPreferredContactId(group: DuplicateGroup<ContactAuditRow>) {
  return [...group.members]
    .sort((left, right) => {
      const scoreDiff = getContactKeepScore(right) - getContactKeepScore(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      const dateDiff = compareIsoDateAsc(left.contact.created_at, right.contact.created_at);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return left.contact.id - right.contact.id;
    })[0]?.contact.id;
}

function buildOrganizationWritePayload(
  organization: TenantBusinessOrganization,
  overrides: Partial<TenantBusinessOrganization> = {}
) {
  return {
    name: overrides.name ?? organization.name,
    legal_name: overrides.legal_name ?? organization.legal_name,
    tax_id: overrides.tax_id ?? organization.tax_id,
    organization_kind: overrides.organization_kind ?? organization.organization_kind,
    phone: overrides.phone ?? organization.phone,
    email: overrides.email ?? organization.email,
    address_line: overrides.address_line ?? organization.address_line,
    commune: overrides.commune ?? organization.commune,
    city: overrides.city ?? organization.city,
    region: overrides.region ?? organization.region,
    country_code: overrides.country_code ?? organization.country_code,
    notes: overrides.notes ?? organization.notes,
    is_active: overrides.is_active ?? organization.is_active,
    sort_order: overrides.sort_order ?? organization.sort_order,
  };
}

function buildClientWritePayload(
  client: TenantBusinessClient,
  overrides: Partial<TenantBusinessClient> = {}
) {
  return {
    organization_id: overrides.organization_id ?? client.organization_id,
    client_code: overrides.client_code ?? client.client_code,
    service_status: overrides.service_status ?? client.service_status,
    commercial_notes: overrides.commercial_notes ?? client.commercial_notes,
    is_active: overrides.is_active ?? client.is_active,
    sort_order: overrides.sort_order ?? client.sort_order,
  };
}

function getClientFieldValue(
  client: TenantBusinessClient,
  field: ClientMergeFieldKey
) {
  switch (field) {
    case "service_status":
      return client.service_status;
    case "commercial_notes":
      return client.commercial_notes;
    default:
      return null;
  }
}

function getClientServiceStatusLabel(
  value: string | null | undefined,
  language: "es" | "en"
) {
  switch (value) {
    case "active":
      return language === "es" ? "Activo" : "Active";
    case "paused":
      return language === "es" ? "Pausado" : "Paused";
    case "prospect":
      return language === "es" ? "Prospecto" : "Prospect";
    default:
      return getMeaningfulText(value) ?? null;
  }
}

function getClientFieldDisplayValue(
  value: string | null | undefined,
  field: ClientMergeFieldKey,
  language: "es" | "en"
) {
  if (field === "service_status") {
    return getClientServiceStatusLabel(value, language);
  }
  return getMeaningfulText(value) ?? null;
}

function getClientMergeFieldLabel(
  field: ClientMergeFieldKey,
  language: "es" | "en"
) {
  if (language === "es") {
    switch (field) {
      case "service_status":
        return "Estado servicio";
      case "commercial_notes":
        return "Notas comerciales";
      default:
        return field;
    }
  }
  switch (field) {
    case "service_status":
      return "Service status";
    case "commercial_notes":
      return "Commercial notes";
    default:
      return field;
  }
}

function buildMergedClientDocumentPayload(
  target: TenantBusinessClient,
  sources: TenantBusinessClient[]
) {
  const prioritizedStatus =
    [target, ...sources].find((client) => client.service_status === "active")?.service_status ??
    [target, ...sources].find((client) => client.service_status === "paused")?.service_status ??
    [target, ...sources].find((client) => client.service_status === "prospect")?.service_status ??
    target.service_status;

  return buildClientWritePayload(target, {
    service_status: prioritizedStatus,
    commercial_notes: mergeDistinctTextBlock([
      target.commercial_notes,
      ...sources.map((source) => source.commercial_notes),
    ]),
    is_active: true,
  });
}

function resolveClientMergePayload(
  target: TenantBusinessClient,
  sources: TenantBusinessClient[],
  selections: ClientMergeSelectionMap = {}
) {
  const autoPayload = buildMergedClientDocumentPayload(target, sources);
  const clients = [target, ...sources];
  const resolved = { ...autoPayload };

  CLIENT_MERGE_FIELDS.forEach((field) => {
    const selection = selections[field];
    if (!selection || selection === "auto") {
      return;
    }
    const clientId = Number(selection.replace("client:", ""));
    if (!Number.isFinite(clientId)) {
      return;
    }
    const selectedClient = clients.find((client) => client.id === clientId);
    if (!selectedClient) {
      return;
    }
    const selectedValue = getClientFieldValue(selectedClient, field);
    if (field === "service_status") {
      resolved.service_status =
        (typeof selectedValue === "string" && selectedValue) || autoPayload.service_status;
      return;
    }
    resolved.commercial_notes = getMeaningfulText(selectedValue) ?? null;
  });

  return resolved;
}

function countClientDocumentFieldsToMerge(
  target: TenantBusinessClient,
  sources: TenantBusinessClient[],
  selections: ClientMergeSelectionMap = {}
) {
  const merged = resolveClientMergePayload(target, sources, selections);
  let count = 0;
  if ((merged.service_status ?? null) !== (target.service_status ?? null)) {
    count += 1;
  }
  if ((merged.commercial_notes ?? null) !== (target.commercial_notes ?? null)) {
    count += 1;
  }
  return count;
}

function buildClientMergeDiffRows(
  target: TenantBusinessClient,
  sources: TenantBusinessClient[],
  selections: ClientMergeSelectionMap = {},
  language: "es" | "en"
): ClientMergeDiffRow[] {
  const resolved = resolveClientMergePayload(target, sources, selections);
  const clients = [target, ...sources];

  return CLIENT_MERGE_FIELDS.map((field) => {
    const selection = selections[field] ?? "auto";
    const selectedClientId =
      selection !== "auto" ? Number(selection.replace("client:", "")) : null;
    const selectedClient =
      selectedClientId !== null
        ? clients.find((client) => client.id === selectedClientId) ?? null
        : null;
    const currentValue = getClientFieldDisplayValue(
      getClientFieldValue(target, field),
      field,
      language
    );
    const nextValue = getClientFieldDisplayValue(
      field === "service_status" ? resolved.service_status : resolved.commercial_notes,
      field,
      language
    );

    return {
      field,
      currentValue,
      nextValue,
      isChanged: (currentValue ?? null) !== (nextValue ?? null),
      sourceLabel: selectedClient
        ? `#${selectedClient.id} · ${
            getClientServiceStatusLabel(selectedClient.service_status, language) ??
            (language === "es" ? "sin estado" : "no status")
          }`
        : null,
      isAutomatic: selection === "auto",
    };
  });
}

function buildMergedOrganizationDocumentPayload(
  target: TenantBusinessOrganization,
  sources: TenantBusinessOrganization[]
) {
  return buildOrganizationWritePayload(target, {
    name: pickPreferredText([target.name, ...sources.map((source) => source.name)]) ?? target.name,
    legal_name: pickPreferredText([target.legal_name, ...sources.map((source) => source.legal_name)]),
    tax_id: pickPreferredText([target.tax_id, ...sources.map((source) => source.tax_id)]),
    phone: pickPreferredText([target.phone, ...sources.map((source) => source.phone)]),
    email: pickPreferredText([target.email, ...sources.map((source) => source.email)]),
    address_line: pickPreferredText([target.address_line, ...sources.map((source) => source.address_line)]),
    commune: pickPreferredText([target.commune, ...sources.map((source) => source.commune)]),
    city: pickPreferredText([target.city, ...sources.map((source) => source.city)]),
    region: pickPreferredText([target.region, ...sources.map((source) => source.region)]),
    country_code: pickPreferredText([target.country_code, ...sources.map((source) => source.country_code)]),
    notes: mergeDistinctTextBlock([target.notes, ...sources.map((source) => source.notes)]),
    is_active: true,
  });
}

function getOrganizationFieldValue(
  organization: TenantBusinessOrganization,
  field: OrganizationMergeFieldKey
) {
  switch (field) {
    case "name":
      return organization.name;
    case "legal_name":
      return organization.legal_name;
    case "tax_id":
      return organization.tax_id;
    case "phone":
      return organization.phone;
    case "email":
      return organization.email;
    case "address_line":
      return organization.address_line;
    case "commune":
      return organization.commune;
    case "city":
      return organization.city;
    case "region":
      return organization.region;
    case "country_code":
      return organization.country_code;
    case "notes":
      return organization.notes;
    default:
      return null;
  }
}

function resolveOrganizationMergePayload(
  target: TenantBusinessOrganization,
  sources: TenantBusinessOrganization[],
  selections: OrganizationMergeSelectionMap = {}
) {
  const autoPayload = buildMergedOrganizationDocumentPayload(target, sources);
  const organizations = [target, ...sources];
  const resolved = { ...autoPayload };

  ORGANIZATION_MERGE_FIELDS.forEach((field) => {
    const selection = selections[field];
    if (!selection || selection === "auto") {
      return;
    }
    const organizationId = Number(selection.replace("organization:", ""));
    if (!Number.isFinite(organizationId)) {
      return;
    }
    const selectedOrganization = organizations.find((organization) => organization.id === organizationId);
    if (!selectedOrganization) {
      return;
    }
    const selectedValue = getOrganizationFieldValue(selectedOrganization, field);
    const normalizedValue = field === "name" ? getMeaningfulText(selectedValue) : getMeaningfulText(selectedValue);
    if (field === "name") {
      resolved.name = normalizedValue ?? autoPayload.name;
      return;
    }
    resolved[field] = normalizedValue;
  });

  return resolved;
}

function buildOrganizationMergeDiffRows(
  target: TenantBusinessOrganization,
  sources: TenantBusinessOrganization[],
  selections: OrganizationMergeSelectionMap = {}
): OrganizationMergeDiffRow[] {
  const resolved = resolveOrganizationMergePayload(target, sources, selections);
  const organizations = [target, ...sources];

  return ORGANIZATION_MERGE_FIELDS.map((field) => {
    const selection = selections[field] ?? "auto";
    const selectedOrganizationId =
      selection !== "auto" ? Number(selection.replace("organization:", "")) : null;
    const selectedOrganization =
      selectedOrganizationId !== null
        ? organizations.find((organization) => organization.id === selectedOrganizationId) ?? null
        : null;
    const currentValue = getMeaningfulText(getOrganizationFieldValue(target, field));
    const nextValue = getMeaningfulText(resolved[field]);

    return {
      field,
      currentValue,
      nextValue,
      isChanged: (currentValue ?? null) !== (nextValue ?? null),
      sourceLabel: selectedOrganization
        ? stripLegacyVisibleText(selectedOrganization.name) ||
          stripLegacyVisibleText(selectedOrganization.legal_name) ||
          `#${selectedOrganization.id}`
        : null,
      isAutomatic: selection === "auto",
    };
  });
}

function buildOrganizationMergeAuditPayload(
  target: TenantBusinessOrganization,
  sources: TenantBusinessOrganization[],
  summary: ReturnType<typeof summarizeOrganizationMerge>,
  selections: OrganizationMergeSelectionMap,
  diffRows: OrganizationMergeDiffRow[],
  preferredClientId: number | null,
  sourceClientIds: number[]
) {
  return {
    entity_kind: "organization",
    entity_id: target.id,
    summary: `organization:${target.id} merged from ${sources.length} source(s)`,
    payload: {
      target: {
        id: target.id,
        name: target.name,
        legal_name: target.legal_name,
        tax_id: target.tax_id,
      },
      source_ids: sources.map((source) => source.id),
      summary,
      preferred_client_id: preferredClientId,
      source_client_ids: sourceClientIds,
      selections,
      diff_rows: diffRows.map((row) => ({
        field: row.field,
        current_value: row.currentValue,
        next_value: row.nextValue,
        source_label: row.sourceLabel,
        is_automatic: row.isAutomatic,
        is_changed: row.isChanged,
      })),
    },
  };
}

function buildClientMergeAuditPayload(
  target: ClientAuditRow,
  sources: ClientAuditRow[],
  summary: ReturnType<typeof summarizeClientContactMerge>,
  documentFieldsToMerge: number,
  selections: ClientMergeSelectionMap,
  diffRows: ClientMergeDiffRow[],
  totalSites: number,
  totalWorkOrders: number
) {
  return {
    entity_kind: "client",
    entity_id: target.client.id,
    summary: `client:${target.client.id} merged from ${sources.length} source(s)`,
    payload: {
      target: {
        id: target.client.id,
        organization_id: target.client.organization_id,
        name: target.organization?.name ?? null,
      },
      source_ids: sources.map((source) => source.client.id),
      source_organization_ids: sources.map((source) => source.client.organization_id),
      summary: {
        sites_moved: totalSites,
        work_orders_moved: totalWorkOrders,
        contacts_to_move: summary.contactsToMove,
        contacts_to_deactivate: summary.contactsToDeactivate,
        source_organizations_remaining: summary.sourceOrganizations,
        document_fields_merged: documentFieldsToMerge,
      },
      selections,
      diff_rows: diffRows.map((row) => ({
        field: row.field,
        current_value: row.currentValue,
        next_value: row.nextValue,
        source_label: row.sourceLabel,
        is_automatic: row.isAutomatic,
        is_changed: row.isChanged,
      })),
    },
  };
}

function buildContactMergeAuditPayload(
  target: ContactAuditRow,
  sources: ContactAuditRow[],
  documentFieldsToMerge: number,
  primarySourcesCount: number,
  selections: ContactMergeSelectionMap,
  diffRows: ContactMergeDiffRow[]
) {
  return {
    entity_kind: "contact",
    entity_id: target.contact.id,
    summary: `contact:${target.contact.id} merged from ${sources.length} source(s)`,
    payload: {
      target: {
        id: target.contact.id,
        organization_id: target.contact.organization_id,
        full_name: target.contact.full_name,
      },
      source_ids: sources.map((source) => source.contact.id),
      summary: {
        document_fields_merged: documentFieldsToMerge,
        primary_sources_count: primarySourcesCount,
      },
      selections,
      diff_rows: diffRows.map((row) => ({
        field: row.field,
        current_value: row.currentValue,
        next_value: row.nextValue,
        source_label: row.sourceLabel,
        is_automatic: row.isAutomatic,
        is_changed: row.isChanged,
      })),
    },
  };
}

function buildSiteMergeAuditPayload(
  target: SiteAuditRow,
  sources: SiteAuditRow[],
  documentFieldsToMerge: number,
  selections: SiteMergeSelectionMap,
  diffRows: SiteMergeDiffRow[],
  totalInstallations: number,
  totalWorkOrders: number
) {
  return {
    entity_kind: "site",
    entity_id: target.site.id,
    summary: `site:${target.site.id} merged from ${sources.length} source(s)`,
    payload: {
      target: {
        id: target.site.id,
        client_id: target.site.client_id,
        label: getVisibleAddressLabel(target.site),
      },
      source_ids: sources.map((source) => source.site.id),
      summary: {
        installations_moved: totalInstallations,
        work_orders_moved: totalWorkOrders,
        document_fields_merged: documentFieldsToMerge,
      },
      selections,
      diff_rows: diffRows.map((row) => ({
        field: row.field,
        current_value: row.currentValue,
        next_value: row.nextValue,
        source_label: row.sourceLabel,
        is_automatic: row.isAutomatic,
        is_changed: row.isChanged,
      })),
    },
  };
}

function buildInstallationMergeAuditPayload(
  target: InstallationAuditRow,
  sources: InstallationAuditRow[],
  totalWorkOrders: number
) {
  return {
    entity_kind: "installation",
    entity_id: target.installation.id,
    summary: `installation:${target.installation.id} merged from ${sources.length} source(s)`,
    payload: {
      target: {
        id: target.installation.id,
        site_id: target.installation.site_id,
        name: target.installation.name,
        serial_number: target.installation.serial_number,
      },
      source_ids: sources.map((source) => source.installation.id),
      summary: {
        work_orders_moved: totalWorkOrders,
      },
    },
  };
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMergeAuditPayloadRecord(audit: TenantBusinessCoreMergeAudit) {
  return isRecordValue(audit.payload) ? audit.payload : null;
}

function getMergeAuditSummaryPayload(audit: TenantBusinessCoreMergeAudit) {
  const payload = getMergeAuditPayloadRecord(audit);
  if (!payload || !isRecordValue(payload.summary)) {
    return null;
  }
  return payload.summary;
}

function getMergeAuditSourceIds(audit: TenantBusinessCoreMergeAudit) {
  const payload = getMergeAuditPayloadRecord(audit);
  return payload && Array.isArray(payload.source_ids) ? payload.source_ids : [];
}

function getMergeAuditDiffRows(audit: TenantBusinessCoreMergeAudit): MergeAuditDiffRowRecord[] {
  const payload = getMergeAuditPayloadRecord(audit);
  if (!payload || !Array.isArray(payload.diff_rows)) {
    return [];
  }
  return payload.diff_rows
    .map((row) => {
      if (!isRecordValue(row) || typeof row.field !== "string") {
        return null;
      }
      return {
        field: row.field,
        current_value: typeof row.current_value === "string" ? row.current_value : null,
        next_value: typeof row.next_value === "string" ? row.next_value : null,
        source_label: typeof row.source_label === "string" ? row.source_label : null,
        is_automatic: row.is_automatic !== false,
        is_changed: row.is_changed !== false,
      };
    })
    .filter((row): row is MergeAuditDiffRowRecord => Boolean(row));
}

function getMergeAuditManualSelectionCount(audit: TenantBusinessCoreMergeAudit) {
  const payload = getMergeAuditPayloadRecord(audit);
  if (!payload || !isRecordValue(payload.selections)) {
    return 0;
  }
  return Object.values(payload.selections).filter(
    (value) => typeof value === "string" && value !== "auto"
  ).length;
}

function getMergeAuditKindLabel(
  entityKind: string,
  language: "es" | "en"
): string {
  switch (entityKind) {
    case "organization":
      return language === "es" ? "Organización" : "Organization";
    case "client":
      return language === "es" ? "Cliente" : "Client";
    case "contact":
      return language === "es" ? "Contacto" : "Contact";
    case "site":
      return language === "es" ? "Dirección" : "Address";
    case "installation":
      return language === "es" ? "Instalación" : "Installation";
    default:
      return entityKind;
  }
}

function getEntityKindFromFilter(
  entityFilter: DuplicateEntityKind | "all"
): string | null {
  switch (entityFilter) {
    case "organizations":
      return "organization";
    case "clients":
      return "client";
    case "contacts":
      return "contact";
    case "sites":
      return "site";
    case "installations":
      return "installation";
    default:
      return null;
  }
}

function getMergeAuditPrimaryLabel(audit: TenantBusinessCoreMergeAudit): string {
  const payload = audit.payload ?? {};
  const target = typeof payload.target === "object" && payload.target ? payload.target : null;
  if (!target || Array.isArray(target)) {
    return audit.summary;
  }
  const record = target as Record<string, unknown>;
  return (
    (typeof record.name === "string" && record.name) ||
    (typeof record.full_name === "string" && record.full_name) ||
    (typeof record.label === "string" && record.label) ||
    audit.summary
  );
}

function getMergeAuditSearchText(audit: TenantBusinessCoreMergeAudit): string {
  const payloadText = audit.payload ? JSON.stringify(audit.payload) : "";
  return [audit.entity_kind, audit.summary, audit.requested_by_email ?? "", payloadText].join(" ");
}

function formatMergeAuditTimestamp(value: string, language: "es" | "en"): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getMergeAuditFieldLabel(
  audit: TenantBusinessCoreMergeAudit,
  field: string,
  language: "es" | "en"
) {
  if (audit.entity_kind === "organization") {
    switch (field as OrganizationMergeFieldKey) {
      case "name":
        return language === "es" ? "Nombre visible" : "Visible name";
      case "legal_name":
        return language === "es" ? "Razón social" : "Legal name";
      case "tax_id":
        return language === "es" ? "RUT / Tax ID" : "Tax ID";
      case "phone":
        return language === "es" ? "Teléfono" : "Phone";
      case "email":
        return "Email";
      case "address_line":
        return language === "es" ? "Dirección" : "Address";
      case "commune":
        return language === "es" ? "Comuna" : "Commune";
      case "city":
        return language === "es" ? "Ciudad" : "City";
      case "region":
        return language === "es" ? "Región" : "Region";
      case "country_code":
        return language === "es" ? "País" : "Country";
      case "notes":
        return language === "es" ? "Notas" : "Notes";
      default:
        return field.replace(/_/g, " ");
    }
  }
  if (audit.entity_kind === "client") {
    return getClientMergeFieldLabel(field as ClientMergeFieldKey, language);
  }
  if (audit.entity_kind === "site") {
    return getSiteMergeFieldLabel(field as SiteMergeFieldKey, language);
  }
  if (audit.entity_kind === "contact") {
    return getContactMergeFieldLabel(field as ContactMergeFieldKey, language);
  }
  return field.replace(/_/g, " ");
}

function renderMergeAuditValue(value: string | null, language: "es" | "en") {
  if (value === "primary") {
    return language === "es" ? "principal" : "primary";
  }
  if (value === "not_primary") {
    return language === "es" ? "no principal" : "not primary";
  }
  return value || "—";
}

function countOrganizationDocumentFieldsToMerge(
  target: TenantBusinessOrganization,
  sources: TenantBusinessOrganization[],
  selections: OrganizationMergeSelectionMap = {}
) {
  const merged = resolveOrganizationMergePayload(target, sources, selections);
  let count = 0;
  if ((merged.legal_name ?? null) !== (target.legal_name ?? null)) {
    count += 1;
  }
  if ((merged.tax_id ?? null) !== (target.tax_id ?? null)) {
    count += 1;
  }
  if ((merged.phone ?? null) !== (target.phone ?? null)) {
    count += 1;
  }
  if ((merged.email ?? null) !== (target.email ?? null)) {
    count += 1;
  }
  if ((merged.notes ?? null) !== (target.notes ?? null)) {
    count += 1;
  }
  return count;
}

function buildMergedContactDocumentPayload(
  target: TenantBusinessContact,
  sources: TenantBusinessContact[]
) {
  return buildContactWritePayload(target, {
    full_name:
      pickPreferredText([target.full_name, ...sources.map((source) => source.full_name)]) ??
      target.full_name,
    email: pickPreferredText([target.email, ...sources.map((source) => source.email)]),
    phone: pickPreferredText([target.phone, ...sources.map((source) => source.phone)]),
    role_title: pickPreferredText([target.role_title, ...sources.map((source) => source.role_title)]),
    is_primary: target.is_primary || sources.some((source) => source.is_primary),
    is_active: target.is_active || sources.some((source) => source.is_active),
  });
}

function getContactFieldValue(
  contact: TenantBusinessContact,
  field: ContactMergeFieldKey
) {
  switch (field) {
    case "full_name":
      return contact.full_name;
    case "email":
      return contact.email;
    case "phone":
      return contact.phone;
    case "role_title":
      return contact.role_title;
    case "is_primary":
      return contact.is_primary ? "primary" : "not_primary";
    default:
      return null;
  }
}

function getContactFieldDisplayValue(
  value: string | null | undefined,
  field: ContactMergeFieldKey,
  language: "es" | "en"
) {
  if (field === "is_primary") {
    if (value === "primary") {
      return language === "es" ? "principal" : "primary";
    }
    if (value === "not_primary") {
      return language === "es" ? "no principal" : "not primary";
    }
  }
  return getMeaningfulText(value) ?? null;
}

function getContactMergeFieldLabel(
  field: ContactMergeFieldKey,
  language: "es" | "en"
) {
  if (language === "es") {
    switch (field) {
      case "full_name":
        return "Nombre visible";
      case "email":
        return "Email";
      case "phone":
        return "Teléfono";
      case "role_title":
        return "Rol";
      case "is_primary":
        return "Contacto principal";
      default:
        return field;
    }
  }
  switch (field) {
    case "full_name":
      return "Visible name";
    case "email":
      return "Email";
    case "phone":
      return "Phone";
    case "role_title":
      return "Role";
    case "is_primary":
      return "Primary contact";
    default:
      return field;
  }
}

function resolveContactMergePayload(
  target: TenantBusinessContact,
  sources: TenantBusinessContact[],
  selections: ContactMergeSelectionMap = {}
) {
  const autoPayload = buildMergedContactDocumentPayload(target, sources);
  const contacts = [target, ...sources];
  const resolved = { ...autoPayload };

  CONTACT_MERGE_FIELDS.forEach((field) => {
    const selection = selections[field];
    if (!selection || selection === "auto") {
      return;
    }
    const contactId = Number(selection.replace("contact:", ""));
    if (!Number.isFinite(contactId)) {
      return;
    }
    const selectedContact = contacts.find((contact) => contact.id === contactId);
    if (!selectedContact) {
      return;
    }
    switch (field) {
      case "full_name":
        resolved.full_name =
          getMeaningfulText(selectedContact.full_name) ?? autoPayload.full_name;
        break;
      case "email":
        resolved.email = getMeaningfulText(selectedContact.email);
        break;
      case "phone":
        resolved.phone = getMeaningfulText(selectedContact.phone);
        break;
      case "role_title":
        resolved.role_title = getMeaningfulText(selectedContact.role_title);
        break;
      case "is_primary":
        resolved.is_primary = selectedContact.is_primary;
        break;
      default:
        break;
    }
  });

  return resolved;
}

function countContactDocumentFieldsToMerge(
  target: TenantBusinessContact,
  sources: TenantBusinessContact[],
  selections: ContactMergeSelectionMap = {}
) {
  const merged = resolveContactMergePayload(target, sources, selections);
  let count = 0;
  if ((merged.email ?? null) !== (target.email ?? null)) {
    count += 1;
  }
  if ((merged.phone ?? null) !== (target.phone ?? null)) {
    count += 1;
  }
  if ((merged.role_title ?? null) !== (target.role_title ?? null)) {
    count += 1;
  }
  if (merged.is_primary !== target.is_primary) {
    count += 1;
  }
  return count;
}

function buildContactMergeDiffRows(
  target: TenantBusinessContact,
  sources: TenantBusinessContact[],
  selections: ContactMergeSelectionMap = {},
  language: "es" | "en"
): ContactMergeDiffRow[] {
  const resolved = resolveContactMergePayload(target, sources, selections);
  const contacts = [target, ...sources];

  return CONTACT_MERGE_FIELDS.map((field) => {
    const selection = selections[field] ?? "auto";
    const selectedContactId =
      selection !== "auto" ? Number(selection.replace("contact:", "")) : null;
    const selectedContact =
      selectedContactId !== null
        ? contacts.find((contact) => contact.id === selectedContactId) ?? null
        : null;
    const currentValue = getContactFieldDisplayValue(
      getContactFieldValue(target, field),
      field,
      language
    );
    const nextValue = getContactFieldDisplayValue(
      field === "full_name"
        ? resolved.full_name
        : field === "email"
          ? resolved.email
          : field === "phone"
            ? resolved.phone
            : field === "role_title"
              ? resolved.role_title
              : resolved.is_primary
                ? "primary"
                : "not_primary",
      field,
      language
    );

    return {
      field,
      currentValue,
      nextValue,
      isChanged: (currentValue ?? null) !== (nextValue ?? null),
      sourceLabel: selectedContact
        ? stripLegacyVisibleText(selectedContact.full_name) || `#${selectedContact.id}`
        : null,
      isAutomatic: selection === "auto",
    };
  });
}

function buildContactWritePayload(
  contact: TenantBusinessContact,
  overrides: Partial<TenantBusinessContact> = {}
) {
  return {
    organization_id: overrides.organization_id ?? contact.organization_id,
    full_name: overrides.full_name ?? contact.full_name,
    email: overrides.email ?? contact.email,
    phone: overrides.phone ?? contact.phone,
    role_title: overrides.role_title ?? contact.role_title,
    is_primary: overrides.is_primary ?? contact.is_primary,
    is_active: overrides.is_active ?? contact.is_active,
    sort_order: overrides.sort_order ?? contact.sort_order,
  };
}

function buildSiteWritePayload(site: TenantBusinessSite, overrides: Partial<TenantBusinessSite> = {}) {
  return {
    client_id: overrides.client_id ?? site.client_id,
    name: overrides.name ?? site.name,
    site_code: overrides.site_code ?? site.site_code,
    address_line: overrides.address_line ?? site.address_line,
    commune: overrides.commune ?? site.commune,
    city: overrides.city ?? site.city,
    region: overrides.region ?? site.region,
    country_code: overrides.country_code ?? site.country_code,
    reference_notes: overrides.reference_notes ?? site.reference_notes,
    is_active: overrides.is_active ?? site.is_active,
    sort_order: overrides.sort_order ?? site.sort_order,
  };
}

function getSiteFieldValue(site: TenantBusinessSite, field: SiteMergeFieldKey) {
  switch (field) {
    case "address_line":
      return site.address_line;
    case "commune":
      return site.commune;
    case "city":
      return site.city;
    case "region":
      return site.region;
    case "country_code":
      return site.country_code;
    case "reference_notes":
      return site.reference_notes;
    default:
      return null;
  }
}

function getSiteMergeFieldLabel(
  field: SiteMergeFieldKey,
  language: "es" | "en"
) {
  if (language === "es") {
    switch (field) {
      case "address_line":
        return "Dirección";
      case "commune":
        return "Comuna";
      case "city":
        return "Ciudad";
      case "region":
        return "Región";
      case "country_code":
        return "País";
      case "reference_notes":
        return "Notas de referencia";
      default:
        return field;
    }
  }
  switch (field) {
    case "address_line":
      return "Address";
    case "commune":
      return "Commune";
    case "city":
      return "City";
    case "region":
      return "Region";
    case "country_code":
      return "Country";
    case "reference_notes":
      return "Reference notes";
    default:
      return field;
  }
}

function getSiteFieldDisplayValue(
  value: string | null | undefined,
  field: SiteMergeFieldKey
) {
  if (field === "reference_notes") {
    return getMeaningfulText(value) ?? null;
  }
  return getMeaningfulText(value) ?? null;
}

function buildMergedSiteDocumentPayload(
  target: TenantBusinessSite,
  sources: TenantBusinessSite[]
) {
  return buildSiteWritePayload(target, {
    address_line: pickPreferredText([
      target.address_line,
      ...sources.map((source) => source.address_line),
    ]),
    commune: pickPreferredText([target.commune, ...sources.map((source) => source.commune)]),
    city: pickPreferredText([target.city, ...sources.map((source) => source.city)]),
    region: pickPreferredText([target.region, ...sources.map((source) => source.region)]),
    country_code: pickPreferredText([
      target.country_code,
      ...sources.map((source) => source.country_code),
    ]),
    reference_notes: mergeDistinctTextBlock([
      target.reference_notes,
      ...sources.map((source) => source.reference_notes),
    ]),
    is_active: true,
  });
}

function resolveSiteMergePayload(
  target: TenantBusinessSite,
  sources: TenantBusinessSite[],
  selections: SiteMergeSelectionMap = {}
) {
  const autoPayload = buildMergedSiteDocumentPayload(target, sources);
  const sites = [target, ...sources];
  const resolved = { ...autoPayload };

  SITE_MERGE_FIELDS.forEach((field) => {
    const selection = selections[field];
    if (!selection || selection === "auto") {
      return;
    }
    const siteId = Number(selection.replace("site:", ""));
    if (!Number.isFinite(siteId)) {
      return;
    }
    const selectedSite = sites.find((site) => site.id === siteId);
    if (!selectedSite) {
      return;
    }
    const selectedValue = getSiteFieldValue(selectedSite, field);
    resolved[field] = getMeaningfulText(selectedValue);
  });

  return resolved;
}

function countSiteDocumentFieldsToMerge(
  target: TenantBusinessSite,
  sources: TenantBusinessSite[],
  selections: SiteMergeSelectionMap = {}
) {
  const merged = resolveSiteMergePayload(target, sources, selections);
  let count = 0;
  SITE_MERGE_FIELDS.forEach((field) => {
    if ((merged[field] ?? null) !== (target[field] ?? null)) {
      count += 1;
    }
  });
  return count;
}

function buildSiteMergeDiffRows(
  target: TenantBusinessSite,
  sources: TenantBusinessSite[],
  selections: SiteMergeSelectionMap = {},
  language: "es" | "en"
): SiteMergeDiffRow[] {
  const resolved = resolveSiteMergePayload(target, sources, selections);
  const sites = [target, ...sources];

  return SITE_MERGE_FIELDS.map((field) => {
    const selection = selections[field] ?? "auto";
    const selectedSiteId =
      selection !== "auto" ? Number(selection.replace("site:", "")) : null;
    const selectedSite =
      selectedSiteId !== null
        ? sites.find((site) => site.id === selectedSiteId) ?? null
        : null;
    const currentValue = getSiteFieldDisplayValue(
      getSiteFieldValue(target, field),
      field
    );
    const nextValue = getSiteFieldDisplayValue(resolved[field], field);

    return {
      field,
      currentValue,
      nextValue,
      isChanged: (currentValue ?? null) !== (nextValue ?? null),
      sourceLabel: selectedSite ? getVisibleAddressLabel(selectedSite) : null,
      isAutomatic: selection === "auto",
    };
  });
}

function buildInstallationWritePayload(
  installation: TenantMaintenanceInstallation,
  overrides: Partial<TenantMaintenanceInstallation> = {}
) {
  return {
    site_id: overrides.site_id ?? installation.site_id,
    equipment_type_id: overrides.equipment_type_id ?? installation.equipment_type_id,
    name: overrides.name ?? installation.name,
    serial_number: overrides.serial_number ?? installation.serial_number,
    manufacturer: overrides.manufacturer ?? installation.manufacturer,
    model: overrides.model ?? installation.model,
    installed_at: overrides.installed_at ?? installation.installed_at,
    last_service_at: overrides.last_service_at ?? installation.last_service_at,
    warranty_until: overrides.warranty_until ?? installation.warranty_until,
    installation_status: overrides.installation_status ?? installation.installation_status,
    location_note: overrides.location_note ?? installation.location_note,
    technical_notes: overrides.technical_notes ?? installation.technical_notes,
    is_active: overrides.is_active ?? installation.is_active,
    sort_order: overrides.sort_order ?? installation.sort_order,
  };
}

function buildWorkOrderWritePayload(
  workOrder: TenantMaintenanceWorkOrder,
  overrides: Partial<TenantMaintenanceWorkOrder> = {}
) {
  return {
    client_id: overrides.client_id ?? workOrder.client_id,
    site_id: overrides.site_id ?? workOrder.site_id,
    installation_id:
      overrides.installation_id !== undefined
        ? overrides.installation_id
        : workOrder.installation_id,
    task_type_id: overrides.task_type_id ?? workOrder.task_type_id,
    assigned_work_group_id:
      overrides.assigned_work_group_id ?? workOrder.assigned_work_group_id,
    external_reference: overrides.external_reference ?? workOrder.external_reference,
    title: overrides.title ?? workOrder.title,
    description: overrides.description ?? workOrder.description,
    priority: overrides.priority ?? workOrder.priority,
    scheduled_for: overrides.scheduled_for ?? workOrder.scheduled_for,
    cancellation_reason: overrides.cancellation_reason ?? workOrder.cancellation_reason,
    closure_notes: overrides.closure_notes ?? workOrder.closure_notes,
    assigned_tenant_user_id:
      overrides.assigned_tenant_user_id ?? workOrder.assigned_tenant_user_id,
    maintenance_status: overrides.maintenance_status ?? workOrder.maintenance_status,
  };
}

function summarizeClientContactMerge(
  group: DuplicateGroup<ClientAuditRow>,
  contactsByOrganizationId: Map<number, TenantBusinessContact[]>
) {
  const targetId = getPreferredClientId(group);
  const target = group.members.find((member) => member.client.id === targetId);
  if (!target) {
    return { contactsToMove: 0, contactsToDeactivate: 0, sourceOrganizations: 0 };
  }
  const targetKeys = new Set(
    (contactsByOrganizationId.get(target.client.organization_id) ?? []).map(buildContactIdentityKey)
  );
  let contactsToMove = 0;
  let contactsToDeactivate = 0;
  let sourceOrganizations = 0;
  group.members
    .filter((member) => member.client.id !== targetId)
    .forEach((source) => {
      sourceOrganizations += 1;
      (contactsByOrganizationId.get(source.client.organization_id) ?? []).forEach((contact) => {
        const identityKey = buildContactIdentityKey(contact);
        if (targetKeys.has(identityKey)) {
          contactsToDeactivate += 1;
          return;
        }
        contactsToMove += 1;
        targetKeys.add(identityKey);
      });
    });
  return { contactsToMove, contactsToDeactivate, sourceOrganizations };
}

  function summarizeOrganizationMerge(
    group: DuplicateGroup<OrganizationAuditRow>,
    contactsByOrganizationId: Map<number, TenantBusinessContact[]>,
    clientRowById: Map<number, ClientAuditRow>,
    selections: OrganizationMergeSelectionMap = {}
  ) {
    const targetId = getPreferredOrganizationId(group);
    const target = group.members.find((member) => member.organization.id === targetId);
    if (!target) {
      return {
        contactsToMove: 0,
        contactsToDeactivate: 0,
        sourceOrganizations: 0,
        totalClientRecords: 0,
        clientsToConsolidate: 0,
        clientReassignments: 0,
        sitesToMove: 0,
        workOrdersToMove: 0,
        documentFieldsToMerge: 0,
      };
    }

    const targetKeys = new Set(
      (contactsByOrganizationId.get(target.organization.id) ?? []).map(buildContactIdentityKey)
    );
    let contactsToMove = 0;
    let contactsToDeactivate = 0;
    let sourceOrganizations = 0;

    group.members
      .filter((member) => member.organization.id !== targetId)
      .forEach((source) => {
        sourceOrganizations += 1;
        (contactsByOrganizationId.get(source.organization.id) ?? []).forEach((contact) => {
          const identityKey = buildContactIdentityKey(contact);
          if (targetKeys.has(identityKey)) {
            contactsToDeactivate += 1;
            return;
          }
          contactsToMove += 1;
          targetKeys.add(identityKey);
        });
      });

    const clientRows = group.members.flatMap((member) => {
      if (!member.client) {
        return [];
      }
      const row = clientRowById.get(member.client.id);
      return row ? [row] : [];
    });
    const preferredClientRow = getPreferredClientRow(clientRows);
    const sourceClientRows = preferredClientRow
      ? clientRows.filter((row) => row.client.id !== preferredClientRow.client.id)
      : [];
    const totalClientRecords = clientRows.length;
    const clientsToConsolidate = sourceClientRows.length;
    const clientReassignments =
      preferredClientRow && preferredClientRow.client.organization_id !== target.organization.id ? 1 : 0;
    const sitesToMove = sourceClientRows.reduce((total, row) => total + row.sitesCount, 0);
    const workOrdersToMove = sourceClientRows.reduce(
      (total, row) => total + row.workOrdersCount,
      0
    );

    return {
      contactsToMove,
      contactsToDeactivate,
      sourceOrganizations,
      totalClientRecords,
      clientsToConsolidate,
      clientReassignments,
      sitesToMove,
      workOrdersToMove,
      documentFieldsToMerge: countOrganizationDocumentFieldsToMerge(
        target.organization,
        group.members
          .filter((member) => member.organization.id !== targetId)
          .map((member) => member.organization),
        selections
      ),
    };
  }

  function summarizeContactDocumentMerge(
    group: DuplicateGroup<ContactAuditRow>,
    selections: ContactMergeSelectionMap = {}
  ) {
    const targetId = getPreferredContactId(group);
    const target = group.members.find((member) => member.contact.id === targetId);
    if (!target) {
      return { documentFieldsToMerge: 0, primarySourcesCount: 0 };
    }
    const sources = group.members
      .filter((member) => member.contact.id !== targetId)
      .map((member) => member.contact);
    return {
      documentFieldsToMerge: countContactDocumentFieldsToMerge(
        target.contact,
        sources,
        selections
      ),
      primarySourcesCount: sources.filter((source) => source.is_primary).length,
    };
  }

  function buildContactDuplicateGroups(rows: ContactAuditRow[]): DuplicateGroup<ContactAuditRow>[] {
    const groups: DuplicateGroup<ContactAuditRow>[] = [];
    const byIdentity = new Map<string, ContactAuditRow[]>();

    rows.forEach((row) => {
      const nameKey = normalizeHumanKey(row.contact.full_name);
      const emailKey = normalizeEmailKey(row.contact.email);
      const phoneKey = normalizePhoneKey(row.contact.phone);
      if (!nameKey || (!emailKey && !phoneKey)) {
        return;
      }
      const compoundKey = `${row.contact.organization_id}::${nameKey}::${emailKey}::${phoneKey}`;
      const current = byIdentity.get(compoundKey) ?? [];
      current.push(row);
      byIdentity.set(compoundKey, current);
    });

    byIdentity.forEach((members, key) => {
      if (members.length < 2) {
        return;
      }
      const organization = members[0]?.organization;
      const label =
        stripLegacyVisibleText(organization?.name) ||
        stripLegacyVisibleText(organization?.legal_name) ||
        `#${members[0]?.contact.organization_id ?? "?"}`;
      groups.push({
        id: `contacts-identity-${key}`,
        kind: "contacts",
        titleEs: `Contactos duplicados en ${label}`,
        titleEn: `Duplicate contacts in ${label}`,
        subtitleEs:
          "Comparten nombre y canal de contacto dentro de la misma organización; conviene dejar una sola ficha operativa.",
        subtitleEn:
          "They share the same name and contact channel inside the same organization; it is better to keep a single operational record.",
        searchText: members
          .map((member) =>
            [
              member.contact.full_name,
              member.contact.email,
              member.contact.phone,
              member.organization?.name,
              member.organization?.legal_name,
            ]
              .filter(Boolean)
              .join(" ")
          )
          .join(" "),
        members,
      });
    });

    return sortByMemberCount(groups);
  }

function buildOrganizationDuplicateGroups(
  rows: OrganizationAuditRow[]
): DuplicateGroup<OrganizationAuditRow>[] {
  const groups: DuplicateGroup<OrganizationAuditRow>[] = [];

  const byTaxId = new Map<string, OrganizationAuditRow[]>();
  rows.forEach((row) => {
    const key = normalizeTaxIdKey(row.organization.tax_id);
    if (!key) {
      return;
    }
    const current = byTaxId.get(key) ?? [];
    current.push(row);
    byTaxId.set(key, current);
  });
  byTaxId.forEach((members, key) => {
    if (members.length < 2) {
      return;
    }
    groups.push({
      id: `organizations-tax-${key}`,
      kind: "organizations",
      titleEs: `Organizaciones duplicadas por RUT: ${key}`,
      titleEn: `Duplicate organizations by tax ID: ${key}`,
      subtitleEs:
        "Comparten el mismo RUT / Tax ID y conviene consolidar la contraparte base antes de seguir limpiando clientes o contactos.",
      subtitleEn:
        "They share the same tax ID and it is better to consolidate the base counterpart before continuing with clients or contacts cleanup.",
      searchText: members
        .map((member) =>
          [
            member.organization.name,
            member.organization.legal_name,
            member.organization.tax_id,
            member.organization.email,
            member.organization.phone,
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" "),
      members,
    });
  });

  const groupedOrganizationIds = new Set(
    groups.flatMap((group) => group.members.map((member) => member.organization.id))
  );
  const byNameAndChannel = new Map<string, OrganizationAuditRow[]>();
  rows.forEach((row) => {
    if (groupedOrganizationIds.has(row.organization.id)) {
      return;
    }
    const nameKey = normalizeHumanKey(row.organization.name || row.organization.legal_name);
    const emailKey = normalizeEmailKey(row.organization.email);
    const phoneKey = normalizePhoneKey(row.organization.phone);
    if (!nameKey || (!emailKey && !phoneKey)) {
      return;
    }
    const compoundKey = `${nameKey}::${emailKey}::${phoneKey}`;
    const current = byNameAndChannel.get(compoundKey) ?? [];
    current.push(row);
    byNameAndChannel.set(compoundKey, current);
  });
  byNameAndChannel.forEach((members, key) => {
    if (members.length < 2) {
      return;
    }
    groups.push({
      id: `organizations-name-channel-${key}`,
      kind: "organizations",
      titleEs: "Organizaciones duplicadas por nombre + canal central",
      titleEn: "Duplicate organizations by name + main channel",
      subtitleEs:
        "Comparten nombre visible y teléfono o email central; útil para depurar contrapartes creadas más de una vez.",
      subtitleEn:
        "They share the same visible name and central phone or email; useful to clean counterparts created more than once.",
      searchText: members
        .map((member) =>
          [
            member.organization.name,
            member.organization.legal_name,
            member.organization.email,
            member.organization.phone,
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" "),
      members,
    });
  });

  return sortByMemberCount(groups);
}

function buildClientDuplicateGroups(rows: ClientAuditRow[]): DuplicateGroup<ClientAuditRow>[] {
  const groups: DuplicateGroup<ClientAuditRow>[] = [];

  const byTaxId = new Map<string, ClientAuditRow[]>();
  rows.forEach((row) => {
    const key = normalizeTaxIdKey(row.organization?.tax_id);
    if (!key) {
      return;
    }
    const current = byTaxId.get(key) ?? [];
    current.push(row);
    byTaxId.set(key, current);
  });
  byTaxId.forEach((members, key) => {
    if (members.length < 2) {
      return;
    }
    groups.push({
      id: `clients-tax-${key}`,
      kind: "clients",
      titleEs: `Clientes duplicados por RUT: ${key}`,
      titleEn: `Duplicate clients by tax ID: ${key}`,
      subtitleEs: "Comparten el mismo RUT / Tax ID y conviene decidir qué ficha mantener activa.",
      subtitleEn: "They share the same tax ID and should be reviewed to decide which record stays active.",
      searchText: members
        .map((member) => [member.organization?.name, member.organization?.tax_id, member.primarySite?.address_line].filter(Boolean).join(" "))
        .join(" "),
      members,
    });
  });

  const groupedClientIds = new Set(
    groups.flatMap((group) => group.members.map((member) => member.client.id))
  );
  const byNameAndAddress = new Map<string, ClientAuditRow[]>();
  rows.forEach((row) => {
    if (groupedClientIds.has(row.client.id)) {
      return;
    }
    const nameKey = normalizeHumanKey(row.organization?.name || row.organization?.legal_name);
    const addressKey = getAddressKey(row.primarySite);
    if (!nameKey || !addressKey) {
      return;
    }
    const compoundKey = `${nameKey}::${addressKey}`;
    const current = byNameAndAddress.get(compoundKey) ?? [];
    current.push(row);
    byNameAndAddress.set(compoundKey, current);
  });
  byNameAndAddress.forEach((members, key) => {
    if (members.length < 2) {
      return;
    }
    groups.push({
      id: `clients-name-address-${key}`,
      kind: "clients",
      titleEs: "Clientes duplicados por nombre + dirección",
      titleEn: "Duplicate clients by name + address",
      subtitleEs: "Comparten nombre comercial y dirección principal visible; útil para depurar importaciones repetidas.",
      subtitleEn: "They share the same visible commercial name and main address; useful to clean repeated imports.",
      searchText: members
        .map((member) => [member.organization?.name, member.primarySite?.address_line, member.primarySite?.commune, member.primarySite?.city].filter(Boolean).join(" "))
        .join(" "),
      members,
    });
  });

  return sortByMemberCount(groups);
}

function buildSiteDuplicateGroups(rows: SiteAuditRow[]): DuplicateGroup<SiteAuditRow>[] {
  const byAddress = new Map<string, SiteAuditRow[]>();
  rows.forEach((row) => {
    const addressKey = getAddressKey(row.site);
    if (!addressKey) {
      return;
    }
    const compoundKey = `${row.site.client_id}::${addressKey}`;
    const current = byAddress.get(compoundKey) ?? [];
    current.push(row);
    byAddress.set(compoundKey, current);
  });

  const groups: DuplicateGroup<SiteAuditRow>[] = [];
  byAddress.forEach((members, key) => {
    if (members.length < 2) {
      return;
    }
    groups.push({
      id: `sites-address-${key}`,
      kind: "sites",
      titleEs: "Direcciones duplicadas por cliente",
      titleEn: "Duplicate addresses by client",
      subtitleEs: "Misma dirección visible dentro del mismo cliente; conviene dejar una sola ficha operativa.",
      subtitleEn: "Same visible address inside the same client; it is usually better to keep a single operational record.",
      searchText: members
        .map((member) => [member.organization?.name, member.site.address_line, member.site.commune, member.site.city, member.site.region].filter(Boolean).join(" "))
        .join(" "),
      members,
    });
  });
  return sortByMemberCount(groups);
}

function buildInstallationDuplicateGroups(rows: InstallationAuditRow[]): DuplicateGroup<InstallationAuditRow>[] {
  const groups: DuplicateGroup<InstallationAuditRow>[] = [];
  const bySerial = new Map<string, InstallationAuditRow[]>();
  rows.forEach((row) => {
    const serialKey = normalizeSerialKey(row.installation.serial_number);
    if (!serialKey) {
      return;
    }
    const compoundKey = `${row.installation.site_id}::${serialKey}`;
    const current = bySerial.get(compoundKey) ?? [];
    current.push(row);
    bySerial.set(compoundKey, current);
  });
  bySerial.forEach((members, key) => {
    if (members.length < 2) {
      return;
    }
    groups.push({
      id: `installations-serial-${key}`,
      kind: "installations",
      titleEs: "Instalaciones duplicadas por serie",
      titleEn: "Duplicate installations by serial",
      subtitleEs: "Mismo número de serie dentro del mismo sitio; suele indicar doble carga del mismo equipo.",
      subtitleEn: "Same serial number inside the same site; it usually indicates the same equipment was loaded twice.",
      searchText: members
        .map((member) => [member.installation.name, member.installation.serial_number, member.site?.address_line].filter(Boolean).join(" "))
        .join(" "),
      members,
    });
  });

  const groupedInstallationIds = new Set(
    groups.flatMap((group) => group.members.map((member) => member.installation.id))
  );
  const byIdentity = new Map<string, InstallationAuditRow[]>();
  rows.forEach((row) => {
    if (groupedInstallationIds.has(row.installation.id)) {
      return;
    }
    const fallbackKey = getInstallationFallbackKey(row.installation);
    if (!fallbackKey) {
      return;
    }
    const compoundKey = `${row.installation.site_id}::${fallbackKey}`;
    const current = byIdentity.get(compoundKey) ?? [];
    current.push(row);
    byIdentity.set(compoundKey, current);
  });
  byIdentity.forEach((members, key) => {
    if (members.length < 2) {
      return;
    }
    groups.push({
      id: `installations-identity-${key}`,
      kind: "installations",
      titleEs: "Instalaciones repetidas por nombre + equipo",
      titleEn: "Repeated installations by name + equipment",
      subtitleEs: "Mismo nombre/fabricante/modelo dentro del mismo sitio; útil para detectar altas duplicadas sin serie.",
      subtitleEn: "Same name/manufacturer/model inside the same site; useful to detect duplicate registrations without serial numbers.",
      searchText: members
        .map((member) => [member.installation.name, member.installation.manufacturer, member.installation.model, member.site?.address_line].filter(Boolean).join(" "))
        .join(" "),
      members,
    });
  });

  return sortByMemberCount(groups);
}

export function BusinessCoreDuplicatesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<TenantMaintenanceEquipmentType[]>([]);
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [mergeAudits, setMergeAudits] = useState<TenantBusinessCoreMergeAudit[]>([]);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<DuplicateEntityKind | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [organizationMergeSelections, setOrganizationMergeSelections] = useState<
    Record<string, OrganizationMergeSelectionMap>
  >({});
  const [clientMergeSelections, setClientMergeSelections] = useState<
    Record<string, ClientMergeSelectionMap>
  >({});
  const [siteMergeSelections, setSiteMergeSelections] = useState<
    Record<string, SiteMergeSelectionMap>
  >({});
  const [contactMergeSelections, setContactMergeSelections] = useState<
    Record<string, ContactMergeSelectionMap>
  >({});

  const organizationById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  );
  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const clientByOrganizationId = useMemo(
    () => new Map(clients.map((item) => [item.organization_id, item])),
    [clients]
  );
  const siteById = useMemo(() => new Map(sites.map((item) => [item.id, item])), [sites]);
  const equipmentTypeById = useMemo(
    () => new Map(equipmentTypes.map((item) => [item.id, item])),
    [equipmentTypes]
  );
  const contactsByOrganizationId = useMemo(() => {
    const grouped = new Map<number, TenantBusinessContact[]>();
    contacts.forEach((contact) => {
      const current = grouped.get(contact.organization_id) ?? [];
      current.push(contact);
      grouped.set(contact.organization_id, current);
    });
    return grouped;
  }, [contacts]);
  const sitesByClientId = useMemo(() => {
    const grouped = new Map<number, TenantBusinessSite[]>();
    sites.forEach((site) => {
      const current = grouped.get(site.client_id) ?? [];
      current.push(site);
      grouped.set(site.client_id, current);
    });
    return grouped;
  }, [sites]);
  const installationsBySiteId = useMemo(() => {
    const grouped = new Map<number, TenantMaintenanceInstallation[]>();
    installations.forEach((installation) => {
      const current = grouped.get(installation.site_id) ?? [];
      current.push(installation);
      grouped.set(installation.site_id, current);
    });
    return grouped;
  }, [installations]);
  const workOrdersByClientId = useMemo(() => {
    const grouped = new Map<number, TenantMaintenanceWorkOrder[]>();
    workOrders.forEach((workOrder) => {
      const current = grouped.get(workOrder.client_id) ?? [];
      current.push(workOrder);
      grouped.set(workOrder.client_id, current);
    });
    return grouped;
  }, [workOrders]);
  const workOrdersBySiteId = useMemo(() => {
    const grouped = new Map<number, TenantMaintenanceWorkOrder[]>();
    workOrders.forEach((workOrder) => {
      const current = grouped.get(workOrder.site_id) ?? [];
      current.push(workOrder);
      grouped.set(workOrder.site_id, current);
    });
    return grouped;
  }, [workOrders]);
  const workOrdersByInstallationId = useMemo(() => {
    const grouped = new Map<number, TenantMaintenanceWorkOrder[]>();
    workOrders.forEach((workOrder) => {
      if (!workOrder.installation_id) {
        return;
      }
      const current = grouped.get(workOrder.installation_id) ?? [];
      current.push(workOrder);
      grouped.set(workOrder.installation_id, current);
    });
    return grouped;
  }, [workOrders]);

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [clientsResponse, contactsResponse, organizationsResponse, sitesResponse, installationsResponse, equipmentTypesResponse, workOrdersResponse, mergeAuditsResponse] =
        await Promise.all([
          getTenantBusinessClients(session.accessToken, { includeInactive: true }),
          getTenantBusinessContacts(session.accessToken, { includeInactive: true }),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantBusinessSites(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceInstallations(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceEquipmentTypes(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceWorkOrders(session.accessToken),
          getTenantBusinessCoreMergeAudits(session.accessToken, { limit: 30 }),
        ]);
      setClients(clientsResponse.data);
      setContacts(contactsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setEquipmentTypes(equipmentTypesResponse.data);
      setWorkOrders(workOrdersResponse.data);
      setMergeAudits(mergeAuditsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!session?.accessToken) {
      setIsLoading(false);
      return;
    }
    void loadData();
  }, [session?.accessToken]);

  const clientRows = useMemo<ClientAuditRow[]>(() => {
    return clients.map((client) => {
      const clientSites = [...(sitesByClientId.get(client.id) ?? [])].sort(
        (left, right) => left.sort_order - right.sort_order || left.id - right.id
      );
      const installationsCount = clientSites.reduce(
        (total, site) => total + (installationsBySiteId.get(site.id)?.length ?? 0),
        0
      );
      return {
        client,
        organization: organizationById.get(client.organization_id) ?? null,
        primarySite: clientSites[0] ?? null,
        contactsCount:
          contactsByOrganizationId.get(client.organization_id)?.filter((contact) => contact.is_active)
            .length ?? 0,
        sitesCount: clientSites.length,
        installationsCount,
        workOrdersCount: workOrdersByClientId.get(client.id)?.length ?? 0,
      };
    });
  }, [clients, contactsByOrganizationId, installationsBySiteId, organizationById, sitesByClientId, workOrdersByClientId]);
  const clientRowById = useMemo(
    () => new Map(clientRows.map((row) => [row.client.id, row])),
    [clientRows]
  );

  const organizationRows = useMemo<OrganizationAuditRow[]>(() => {
    return organizations.map((organization) => {
      const client = clientByOrganizationId.get(organization.id) ?? null;
      return {
        organization,
        client,
        contactsCount: contactsByOrganizationId.get(organization.id)?.length ?? 0,
        sitesCount: client ? sitesByClientId.get(client.id)?.length ?? 0 : 0,
        workOrdersCount: client ? workOrdersByClientId.get(client.id)?.length ?? 0 : 0,
      };
    });
  }, [clientByOrganizationId, contactsByOrganizationId, organizations, sitesByClientId, workOrdersByClientId]);

  const siteRows = useMemo<SiteAuditRow[]>(() => {
    return sites.map((site) => {
      const client = clientById.get(site.client_id) ?? null;
      return {
        site,
        client,
        organization: organizationById.get(client?.organization_id ?? -1) ?? null,
        installationsCount: installationsBySiteId.get(site.id)?.length ?? 0,
        workOrdersCount: workOrdersBySiteId.get(site.id)?.length ?? 0,
      };
    });
  }, [clientById, installationsBySiteId, organizationById, sites, workOrdersBySiteId]);

  const contactRows = useMemo<ContactAuditRow[]>(() => {
    return contacts.map((contact) => ({
      contact,
      organization: organizationById.get(contact.organization_id) ?? null,
      client: clientByOrganizationId.get(contact.organization_id) ?? null,
    }));
  }, [clientByOrganizationId, contacts, organizationById]);

  const installationRows = useMemo<InstallationAuditRow[]>(() => {
    return installations.map((installation) => {
      const site = siteById.get(installation.site_id) ?? null;
      const client = site ? clientById.get(site.client_id) ?? null : null;
      return {
        installation,
        site,
        client,
        organization: organizationById.get(client?.organization_id ?? -1) ?? null,
        equipmentType: equipmentTypeById.get(installation.equipment_type_id) ?? null,
        workOrdersCount: workOrdersByInstallationId.get(installation.id)?.length ?? 0,
      };
    });
  }, [clientById, equipmentTypeById, installations, organizationById, siteById, workOrdersByInstallationId]);

  const organizationGroups = useMemo(
    () => buildOrganizationDuplicateGroups(organizationRows),
    [organizationRows]
  );
  const clientGroups = useMemo(() => buildClientDuplicateGroups(clientRows), [clientRows]);
  const contactGroups = useMemo(() => buildContactDuplicateGroups(contactRows), [contactRows]);
  const siteGroups = useMemo(() => buildSiteDuplicateGroups(siteRows), [siteRows]);
  const installationGroups = useMemo(
    () => buildInstallationDuplicateGroups(installationRows),
    [installationRows]
  );

  function filterGroups<T>(groups: DuplicateGroup<T>[], kind: DuplicateEntityKind) {
    if (entityFilter !== "all" && entityFilter !== kind) {
      return [];
    }
    const term = normalizeHumanKey(search);
    if (!term) {
      return groups;
    }
    return groups.filter((group) => normalizeHumanKey(group.searchText).includes(term));
  }

  const visibleOrganizationGroups = useMemo(
    () => filterGroups(organizationGroups, "organizations"),
    [entityFilter, organizationGroups, search]
  );
  const visibleClientGroups = useMemo(
    () => filterGroups(clientGroups, "clients"),
    [clientGroups, entityFilter, search]
  );
  const visibleContactGroups = useMemo(
    () => filterGroups(contactGroups, "contacts"),
    [contactGroups, entityFilter, search]
  );
  const visibleSiteGroups = useMemo(
    () => filterGroups(siteGroups, "sites"),
    [siteGroups, entityFilter, search]
  );
  const visibleInstallationGroups = useMemo(
    () => filterGroups(installationGroups, "installations"),
    [installationGroups, entityFilter, search]
  );
  const visibleMergeAudits = useMemo(() => {
    const normalizedSearch = normalizeHumanKey(search);
    const expectedEntityKind = getEntityKindFromFilter(entityFilter);
    return mergeAudits.filter((audit) => {
      if (expectedEntityKind && audit.entity_kind !== expectedEntityKind) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return normalizeHumanKey(getMergeAuditSearchText(audit)).includes(normalizedSearch);
    });
  }, [entityFilter, mergeAudits, search]);

  const totalVisibleGroups =
    visibleOrganizationGroups.length +
    visibleClientGroups.length +
    visibleContactGroups.length +
    visibleSiteGroups.length +
    visibleInstallationGroups.length;
  const safeDeleteCandidates =
    visibleOrganizationGroups.reduce(
      (total, group) =>
        total + group.members.filter((member) => !member.client && member.contactsCount === 0).length,
      0
    ) +
    visibleClientGroups.reduce(
      (total, group) =>
        total +
        group.members.filter(
          (member) => member.sitesCount === 0 && member.installationsCount === 0 && member.workOrdersCount === 0
        ).length,
      0
    ) +
    visibleContactGroups.reduce(
      (total, group) => total + group.members.filter((member) => !member.contact.is_primary).length,
      0
    ) +
    visibleSiteGroups.reduce(
      (total, group) =>
        total + group.members.filter((member) => member.installationsCount === 0 && member.workOrdersCount === 0).length,
      0
    ) +
    visibleInstallationGroups.reduce(
      (total, group) => total + group.members.filter((member) => member.workOrdersCount === 0).length,
      0
    );

  async function handleDeleteClient(row: ClientAuditRow) {
    if (!session?.accessToken) {
      return;
    }
    const label = getClientName(row.organization, language);
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${label}". Solo conviene hacerlo si es un duplicado sin sitios, instalaciones ni mantenciones asociadas.`
        : `Delete "${label}". This only makes sense for a duplicate without linked sites, installations, or work orders.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await deleteTenantBusinessClient(session.accessToken, row.client.id);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteOrganization(row: OrganizationAuditRow) {
    if (!session?.accessToken) {
      return;
    }
    const label = getClientName(row.organization, language);
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${label}". Solo conviene hacerlo si no tiene cliente ni contactos asociados.`
        : `Delete "${label}". This only makes sense if it has no linked client or contacts.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await deleteTenantBusinessOrganization(
        session.accessToken,
        row.organization.id
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteContact(row: ContactAuditRow) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar el contacto "${row.contact.full_name}". Solo conviene hacerlo si es una ficha duplicada y no es el contacto principal que quieres conservar.`
        : `Delete contact "${row.contact.full_name}". This only makes sense if it is a duplicate record and not the primary contact you want to keep.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await deleteTenantBusinessContact(session.accessToken, row.contact.id);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteSite(row: SiteAuditRow) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar la dirección "${getVisibleAddressLabel(row.site)}". Solo conviene hacerlo si no tiene instalaciones ni mantenciones asociadas.`
        : `Delete address "${getVisibleAddressLabel(row.site)}". This only makes sense if it has no linked installations or work orders.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await deleteTenantBusinessSite(session.accessToken, row.site.id);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteInstallation(row: InstallationAuditRow) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar la instalación "${row.installation.name}". Solo conviene hacerlo si no tiene mantenciones asociadas.`
        : `Delete installation "${row.installation.name}". This only makes sense if it has no linked work orders.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await deleteTenantMaintenanceInstallation(
        session.accessToken,
        row.installation.id
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeactivateClient(row: ClientAuditRow) {
    if (!session?.accessToken || !row.client.is_active) {
      return;
    }
    const label = getClientName(row.organization, language);
    const confirmed = window.confirm(
      language === "es"
        ? `Desactivar "${label}" para dejarlo fuera de operación sin perder historial.`
        : `Deactivate "${label}" to remove it from active operation without losing history.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await updateTenantBusinessClientStatus(
        session.accessToken,
        row.client.id,
        false
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeactivateOrganization(row: OrganizationAuditRow) {
    if (!session?.accessToken || !row.organization.is_active || row.client) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Desactivar "${getClientName(row.organization, language)}" para dejarla fuera de operación sin perder trazabilidad de la contraparte base.`
        : `Deactivate "${getClientName(row.organization, language)}" to remove it from operation without losing base counterpart traceability.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await updateTenantBusinessOrganizationStatus(
        session.accessToken,
        row.organization.id,
        false
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeactivateContact(row: ContactAuditRow) {
    if (!session?.accessToken || !row.contact.is_active) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Desactivar el contacto "${row.contact.full_name}" para conservar trazabilidad sin dejarlo operativo.`
        : `Deactivate contact "${row.contact.full_name}" to preserve traceability without leaving it operational.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await updateTenantBusinessContactStatus(
        session.accessToken,
        row.contact.id,
        false
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeactivateSite(row: SiteAuditRow) {
    if (!session?.accessToken || !row.site.is_active) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Desactivar la dirección "${getVisibleAddressLabel(row.site)}" para conservar trazabilidad sin usarla en operación diaria.`
        : `Deactivate address "${getVisibleAddressLabel(row.site)}" to preserve traceability without using it in daily operation.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await updateTenantBusinessSiteStatus(
        session.accessToken,
        row.site.id,
        false
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeactivateInstallation(row: InstallationAuditRow) {
    if (!session?.accessToken || !row.installation.is_active) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Desactivar la instalación "${row.installation.name}" para dejarla fuera de operación sin perder historial.`
        : `Deactivate installation "${row.installation.name}" to remove it from operation without losing history.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const response = await updateTenantMaintenanceInstallationStatus(
        session.accessToken,
        row.installation.id,
        false
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleMergeClientGroup(group: DuplicateGroup<ClientAuditRow>) {
    if (!session?.accessToken) {
      return;
    }
    const targetId = getPreferredClientId(group);
    const target = group.members.find((member) => member.client.id === targetId);
    const sources = group.members.filter((member) => member.client.id !== targetId);
    if (!target || sources.length === 0) {
      return;
    }
    const totalSites = sources.reduce(
      (total, source) => total + sites.filter((site) => site.client_id === source.client.id).length,
      0
    );
    const totalWorkOrders = sources.reduce(
      (total, source) =>
        total + workOrders.filter((workOrder) => workOrder.client_id === source.client.id).length,
      0
    );
    const selections = clientMergeSelections[group.id] ?? {};
    const { contactsToMove, contactsToDeactivate, sourceOrganizations } =
      summarizeClientContactMerge(group, contactsByOrganizationId);
    const documentFieldsToMerge = countClientDocumentFieldsToMerge(
      target.client,
      sources.map((source) => source.client),
      selections
    );
    const diffRows = buildClientMergeDiffRows(
      target.client,
      sources.map((source) => source.client),
      selections,
      language
    );
    const confirmed = window.confirm(
      language === "es"
        ? `Consolidar ${sources.length} ficha(s) duplicada(s) en "${getClientName(target.organization, language)}". Se moverán ${totalSites} direcciones, ${totalWorkOrders} OT y ${contactsToMove} contacto(s) al cliente sugerido; ${contactsToDeactivate} contacto(s) duplicado(s) se desactivarán, se integrarán ${documentFieldsToMerge} dato(s) documental(es) del cliente y quedarán ${sourceOrganizations} organización(es) origen para revisión manual.`
        : `Consolidate ${sources.length} duplicate record(s) into "${getClientName(target.organization, language)}". ${totalSites} addresses, ${totalWorkOrders} work orders, and ${contactsToMove} contact(s) will be moved to the suggested client; ${contactsToDeactivate} duplicated contact(s) will be deactivated, ${documentFieldsToMerge} client documentary field(s) will be merged and ${sourceOrganizations} source organization(s) will remain for manual review.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      if (documentFieldsToMerge > 0) {
        await updateTenantBusinessClient(
          session.accessToken,
          target.client.id,
          resolveClientMergePayload(
            target.client,
            sources.map((source) => source.client),
            selections
          )
        );
      }
      const targetContactByIdentity = new Map(
        (contactsByOrganizationId.get(target.client.organization_id) ?? []).map((contact) => [
          buildContactIdentityKey(contact),
          contact,
        ])
      );
      const targetContactKeys = new Set(
        (contactsByOrganizationId.get(target.client.organization_id) ?? []).map(buildContactIdentityKey)
      );
      for (const source of sources) {
        const relatedContacts = contactsByOrganizationId.get(source.client.organization_id) ?? [];
        for (const contact of relatedContacts) {
          const identityKey = buildContactIdentityKey(contact);
          if (targetContactKeys.has(identityKey)) {
            const existingTargetContact = targetContactByIdentity.get(identityKey);
            if (existingTargetContact) {
              const mergedPayload = buildMergedContactDocumentPayload(existingTargetContact, [contact]);
              if (
                countContactDocumentFieldsToMerge(existingTargetContact, [contact]) > 0
              ) {
                await updateTenantBusinessContact(
                  session.accessToken,
                  existingTargetContact.id,
                  mergedPayload
                );
                targetContactByIdentity.set(identityKey, {
                  ...existingTargetContact,
                  ...mergedPayload,
                });
              }
            }
            if (contact.is_active) {
              await updateTenantBusinessContactStatus(session.accessToken, contact.id, false);
            }
            continue;
          }
          await updateTenantBusinessContact(
            session.accessToken,
            contact.id,
            {
              organization_id: target.client.organization_id,
              full_name: contact.full_name,
              email: contact.email,
              phone: contact.phone,
              role_title: contact.role_title,
              is_primary: contact.is_primary,
              is_active: contact.is_active,
              sort_order: contact.sort_order,
            }
          );
          targetContactKeys.add(identityKey);
        }
        const relatedSites = sites.filter((site) => site.client_id === source.client.id);
        for (const site of relatedSites) {
          await updateTenantBusinessSite(
            session.accessToken,
            site.id,
            buildSiteWritePayload(site, { client_id: target.client.id })
          );
        }
        const relatedWorkOrders = workOrders.filter(
          (workOrder) => workOrder.client_id === source.client.id
        );
        for (const workOrder of relatedWorkOrders) {
          await updateTenantMaintenanceWorkOrder(
            session.accessToken,
            workOrder.id,
            buildWorkOrderWritePayload(workOrder, { client_id: target.client.id })
          );
        }
        if (source.client.is_active) {
          await updateTenantBusinessClientStatus(session.accessToken, source.client.id, false);
        }
      }
      try {
        await createTenantBusinessCoreMergeAudit(
          session.accessToken,
          buildClientMergeAuditPayload(
            target,
            sources,
            { contactsToMove, contactsToDeactivate, sourceOrganizations },
            documentFieldsToMerge,
            selections,
            diffRows,
            totalSites,
            totalWorkOrders
          )
        );
      } catch (auditError) {
        console.warn("Unable to persist client merge audit", auditError);
      }
      setFeedback(
        language === "es"
          ? `Consolidación aplicada sobre ${sources.length} ficha(s) duplicada(s), incluyendo contactos reutilizables hacia la ficha sugerida.`
          : `Consolidation applied to ${sources.length} duplicate record(s), including reusable contacts moved to the suggested record.`
      );
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleMergeOrganizationGroup(group: DuplicateGroup<OrganizationAuditRow>) {
    if (!session?.accessToken) {
      return;
    }
    const targetId = getPreferredOrganizationId(group);
    const target = group.members.find((member) => member.organization.id === targetId);
    const sources = group.members.filter((member) => member.organization.id !== targetId);
    if (!target || sources.length === 0) {
      return;
    }
    const selections = organizationMergeSelections[group.id] ?? {};

    const summary = summarizeOrganizationMerge(
      group,
      contactsByOrganizationId,
      clientRowById,
      selections
    );
    const sourceOrganizations = sources.map((source) => source.organization);
    const diffRows = buildOrganizationMergeDiffRows(target.organization, sourceOrganizations, selections);
    const clientRowsInGroup = group.members.flatMap((member) => {
      if (!member.client) {
        return [];
      }
      const row = clientRowById.get(member.client.id);
      return row ? [row] : [];
    });
    const preferredClientRow = getPreferredClientRow(clientRowsInGroup);
    const sourceClientRows = preferredClientRow
      ? clientRowsInGroup.filter((row) => row.client.id !== preferredClientRow.client.id)
      : [];

    const confirmed = window.confirm(
      language === "es"
        ? `Consolidar ${sources.length} organización(es) duplicada(s) en "${getClientName(target.organization, language)}". Se consolidarán ${summary.clientsToConsolidate} cliente(s), se moverán ${summary.sitesToMove} direcciones, ${summary.workOrdersToMove} OT y ${summary.contactsToMove} contacto(s); ${summary.contactsToDeactivate} contacto(s) duplicado(s) se desactivarán y ${summary.clientReassignments} cliente(s) final(es) se reasignarán a la organización sugerida antes de desactivar los orígenes.`
        : `Consolidate ${sources.length} duplicate organization(s) into "${getClientName(target.organization, language)}". ${summary.clientsToConsolidate} client(s) will be consolidated, ${summary.sitesToMove} addresses, ${summary.workOrdersToMove} work orders, and ${summary.contactsToMove} contact(s) will be moved; ${summary.contactsToDeactivate} duplicate contact(s) will be deactivated and ${summary.clientReassignments} final client(s) will be reassigned to the suggested organization before deactivating the sources.`
    );
    if (!confirmed) {
      return;
    }

    setIsMutating(true);
    setError(null);
    try {
      await updateTenantBusinessOrganization(
        session.accessToken,
        target.organization.id,
        resolveOrganizationMergePayload(
          target.organization,
          sources.map((source) => source.organization),
          selections
        )
      );

      if (preferredClientRow) {
        for (const sourceClientRow of sourceClientRows) {
          const relatedSites = sites.filter(
            (site) => site.client_id === sourceClientRow.client.id
          );
          for (const site of relatedSites) {
            await updateTenantBusinessSite(
              session.accessToken,
              site.id,
              buildSiteWritePayload(site, { client_id: preferredClientRow.client.id })
            );
          }
          const relatedWorkOrders = workOrders.filter(
            (workOrder) => workOrder.client_id === sourceClientRow.client.id
          );
          for (const workOrder of relatedWorkOrders) {
            await updateTenantMaintenanceWorkOrder(
              session.accessToken,
              workOrder.id,
              buildWorkOrderWritePayload(workOrder, { client_id: preferredClientRow.client.id })
            );
          }
          if (sourceClientRow.client.is_active) {
            await updateTenantBusinessClientStatus(
              session.accessToken,
              sourceClientRow.client.id,
              false
            );
          }
        }
      }

      if (preferredClientRow && preferredClientRow.client.organization_id !== target.organization.id) {
        await updateTenantBusinessClient(
          session.accessToken,
          preferredClientRow.client.id,
          buildClientWritePayload(preferredClientRow.client, {
            organization_id: target.organization.id,
          })
        );
      }

      const targetContactByIdentity = new Map(
        (contactsByOrganizationId.get(target.organization.id) ?? []).map((contact) => [
          buildContactIdentityKey(contact),
          contact,
        ])
      );
      const targetContactKeys = new Set(
        (contactsByOrganizationId.get(target.organization.id) ?? []).map(buildContactIdentityKey)
      );
      for (const source of sources) {
        const relatedContacts = contactsByOrganizationId.get(source.organization.id) ?? [];
        for (const contact of relatedContacts) {
          const identityKey = buildContactIdentityKey(contact);
          if (targetContactKeys.has(identityKey)) {
            const existingTargetContact = targetContactByIdentity.get(identityKey);
            if (existingTargetContact) {
              const mergedPayload = buildMergedContactDocumentPayload(existingTargetContact, [contact]);
              if (countContactDocumentFieldsToMerge(existingTargetContact, [contact]) > 0) {
                await updateTenantBusinessContact(
                  session.accessToken,
                  existingTargetContact.id,
                  mergedPayload
                );
                targetContactByIdentity.set(identityKey, {
                  ...existingTargetContact,
                  ...mergedPayload,
                });
              }
            }
            if (contact.is_active) {
              await updateTenantBusinessContactStatus(session.accessToken, contact.id, false);
            }
            continue;
          }
          await updateTenantBusinessContact(
            session.accessToken,
            contact.id,
            buildContactWritePayload(contact, { organization_id: target.organization.id })
          );
          targetContactKeys.add(identityKey);
        }
        if (source.organization.is_active) {
          await updateTenantBusinessOrganizationStatus(
            session.accessToken,
            source.organization.id,
            false
          );
        }
      }

      try {
        await createTenantBusinessCoreMergeAudit(
          session.accessToken,
          buildOrganizationMergeAuditPayload(
            target.organization,
            sourceOrganizations,
            summary,
            selections,
            diffRows,
            preferredClientRow?.client.id ?? null,
            sourceClientRows.map((row) => row.client.id)
          )
        );
      } catch (auditError) {
        console.warn("Unable to persist organization merge audit", auditError);
      }

      setFeedback(
        language === "es"
          ? `Consolidación aplicada sobre ${sources.length} organización(es) duplicada(s), incluyendo la asimilación guiada de clientes en conflicto cuando correspondía.`
          : `Consolidation applied to ${sources.length} duplicate organization(s), including guided client assimilation when required.`
      );
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleMergeSiteGroup(group: DuplicateGroup<SiteAuditRow>) {
    if (!session?.accessToken) {
      return;
    }
    const targetId = getPreferredSiteId(group);
    const target = group.members.find((member) => member.site.id === targetId);
    const sources = group.members.filter((member) => member.site.id !== targetId);
    if (!target || sources.length === 0) {
      return;
    }
    const selections = siteMergeSelections[group.id] ?? {};
    const totalInstallations = sources.reduce(
      (total, source) =>
        total + installations.filter((item) => item.site_id === source.site.id).length,
      0
    );
    const totalWorkOrders = sources.reduce(
      (total, source) =>
        total + workOrders.filter((workOrder) => workOrder.site_id === source.site.id).length,
      0
    );
    const documentFieldsToMerge = countSiteDocumentFieldsToMerge(
      target.site,
      sources.map((source) => source.site),
      selections
    );
    const diffRows = buildSiteMergeDiffRows(
      target.site,
      sources.map((source) => source.site),
      selections,
      language
    );
    const confirmed = window.confirm(
      language === "es"
        ? `Consolidar ${sources.length} dirección(es) duplicada(s) en "${getVisibleAddressLabel(target.site)}". Se moverán ${totalInstallations} instalaciones y ${totalWorkOrders} OT al sitio sugerido, se integrarán ${documentFieldsToMerge} dato(s) documental(es) y luego se desactivarán los sitios origen.`
        : `Consolidate ${sources.length} duplicate address(es) into "${getVisibleAddressLabel(target.site)}". ${totalInstallations} installations and ${totalWorkOrders} work orders will be moved to the suggested site, ${documentFieldsToMerge} documentary field(s) will be merged and the source sites will then be deactivated.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      if (documentFieldsToMerge > 0) {
        await updateTenantBusinessSite(
          session.accessToken,
          target.site.id,
          resolveSiteMergePayload(
            target.site,
            sources.map((source) => source.site),
            selections
          )
        );
      }
      for (const source of sources) {
        const relatedInstallations = installations.filter(
          (item) => item.site_id === source.site.id
        );
        for (const installation of relatedInstallations) {
          await updateTenantMaintenanceInstallation(
            session.accessToken,
            installation.id,
            buildInstallationWritePayload(installation, { site_id: target.site.id })
          );
        }
        const relatedWorkOrders = workOrders.filter(
          (workOrder) => workOrder.site_id === source.site.id
        );
        for (const workOrder of relatedWorkOrders) {
          await updateTenantMaintenanceWorkOrder(
            session.accessToken,
            workOrder.id,
            buildWorkOrderWritePayload(workOrder, {
              client_id: target.site.client_id,
              site_id: target.site.id,
            })
          );
        }
        if (source.site.is_active) {
          await updateTenantBusinessSiteStatus(session.accessToken, source.site.id, false);
        }
      }
      try {
        await createTenantBusinessCoreMergeAudit(
          session.accessToken,
          buildSiteMergeAuditPayload(
            target,
            sources,
            documentFieldsToMerge,
            selections,
            diffRows,
            totalInstallations,
            totalWorkOrders
          )
        );
      } catch (auditError) {
        console.warn("Unable to persist site merge audit", auditError);
      }
      setFeedback(
        language === "es"
          ? `Consolidación aplicada sobre ${sources.length} dirección(es) duplicada(s).`
          : `Consolidation applied to ${sources.length} duplicate address(es).`
      );
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleMergeContactGroup(group: DuplicateGroup<ContactAuditRow>) {
    if (!session?.accessToken) {
      return;
    }
    const targetId = getPreferredContactId(group);
    const target = group.members.find((member) => member.contact.id === targetId);
    const sources = group.members.filter((member) => member.contact.id !== targetId);
    if (!target || sources.length === 0) {
      return;
    }
    const selections = contactMergeSelections[group.id] ?? {};
    const { documentFieldsToMerge, primarySourcesCount } = summarizeContactDocumentMerge(
      group,
      selections
    );
    const diffRows = buildContactMergeDiffRows(
      target.contact,
      sources.map((member) => member.contact),
      selections,
      language
    );
    const confirmed = window.confirm(
      language === "es"
        ? `Consolidar ${sources.length} contacto(s) duplicado(s) en "${target.contact.full_name}". Se integrarán ${documentFieldsToMerge} dato(s) documental(es) faltante(s), los contactos origen se desactivarán y ${primarySourcesCount > 0 && !target.contact.is_primary ? "la ficha sugerida quedará como principal" : "se conservará la mejor ficha visible"}.`
        : `Consolidate ${sources.length} duplicate contact(s) into "${target.contact.full_name}". ${documentFieldsToMerge} missing documentary field(s) will be integrated, source contacts will be deactivated, and ${primarySourcesCount > 0 && !target.contact.is_primary ? "the suggested record will become primary" : "the best visible record will be kept"}.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      if (documentFieldsToMerge > 0 || (primarySourcesCount > 0 && !target.contact.is_primary)) {
        await updateTenantBusinessContact(
          session.accessToken,
          target.contact.id,
          resolveContactMergePayload(
            target.contact,
            sources.map((member) => member.contact),
            selections
          )
        );
      }
      for (const source of sources) {
        if (source.contact.is_active) {
          await updateTenantBusinessContactStatus(session.accessToken, source.contact.id, false);
        }
      }
      try {
        await createTenantBusinessCoreMergeAudit(
          session.accessToken,
          buildContactMergeAuditPayload(
            target,
            sources,
            documentFieldsToMerge,
            primarySourcesCount,
            selections,
            diffRows
          )
        );
      } catch (auditError) {
        console.warn("Unable to persist contact merge audit", auditError);
      }
      setFeedback(
        language === "es"
          ? `Consolidación aplicada sobre ${sources.length} contacto(s) duplicado(s).`
          : `Consolidation applied to ${sources.length} duplicate contact(s).`
      );
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  async function handleMergeInstallationGroup(group: DuplicateGroup<InstallationAuditRow>) {
    if (!session?.accessToken) {
      return;
    }
    const targetId = getPreferredInstallationId(group);
    const target = group.members.find((member) => member.installation.id === targetId);
    const sources = group.members.filter((member) => member.installation.id !== targetId);
    if (!target || sources.length === 0) {
      return;
    }
    const totalWorkOrders = sources.reduce(
      (total, source) =>
        total +
        workOrders.filter((workOrder) => workOrder.installation_id === source.installation.id).length,
      0
    );
    const confirmed = window.confirm(
      language === "es"
        ? `Consolidar ${sources.length} instalación(es) duplicada(s) en "${target.installation.name}". Se moverán ${totalWorkOrders} OT a la instalación sugerida y luego se desactivarán las instalaciones origen.`
        : `Consolidate ${sources.length} duplicate installation(s) into "${target.installation.name}". ${totalWorkOrders} work orders will be moved to the suggested installation and the source installations will then be deactivated.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      for (const source of sources) {
        const relatedWorkOrders = workOrders.filter(
          (workOrder) => workOrder.installation_id === source.installation.id
        );
        for (const workOrder of relatedWorkOrders) {
          await updateTenantMaintenanceWorkOrder(
            session.accessToken,
            workOrder.id,
            buildWorkOrderWritePayload(workOrder, {
              client_id: target.client?.id ?? workOrder.client_id,
              site_id: target.site?.id ?? workOrder.site_id,
              installation_id: target.installation.id,
            })
          );
        }
        if (source.installation.is_active) {
          await updateTenantMaintenanceInstallationStatus(
            session.accessToken,
            source.installation.id,
            false
          );
        }
      }
      try {
        await createTenantBusinessCoreMergeAudit(
          session.accessToken,
          buildInstallationMergeAuditPayload(target, sources, totalWorkOrders)
        );
      } catch (auditError) {
        console.warn("Unable to persist installation merge audit", auditError);
      }
      setFeedback(
        language === "es"
          ? `Consolidación aplicada sobre ${sources.length} instalación(es) duplicada(s).`
          : `Consolidation applied to ${sources.length} duplicate installation(s).`
      );
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsMutating(false);
    }
  }

  function getOrganizationMergeFieldLabel(field: OrganizationMergeFieldKey) {
    if (language === "es") {
      switch (field) {
        case "name":
          return "Nombre visible";
        case "legal_name":
          return "Razón social";
        case "tax_id":
          return "RUT / Tax ID";
        case "phone":
          return "Teléfono";
        case "email":
          return "Email";
        case "notes":
          return "Notas";
        default:
          return field;
      }
    }
    switch (field) {
      case "name":
        return "Visible name";
      case "legal_name":
        return "Legal name";
      case "tax_id":
        return "Tax ID";
      case "phone":
        return "Phone";
      case "email":
        return "Email";
      case "notes":
        return "Notes";
      default:
        return field;
    }
  }

  function updateOrganizationMergeSelection(
    groupId: string,
    field: OrganizationMergeFieldKey,
    value: string
  ) {
    setOrganizationMergeSelections((current) => ({
      ...current,
      [groupId]: {
        ...(current[groupId] ?? {}),
        [field]: value,
      },
    }));
  }

  function updateClientMergeSelection(
    groupId: string,
    field: ClientMergeFieldKey,
    value: string
  ) {
    setClientMergeSelections((current) => ({
      ...current,
      [groupId]: {
        ...(current[groupId] ?? {}),
        [field]: value,
      },
    }));
  }

  function updateSiteMergeSelection(
    groupId: string,
    field: SiteMergeFieldKey,
    value: string
  ) {
    setSiteMergeSelections((current) => ({
      ...current,
      [groupId]: {
        ...(current[groupId] ?? {}),
        [field]: value,
      },
    }));
  }

  function updateContactMergeSelection(
    groupId: string,
    field: ContactMergeFieldKey,
    value: string
  ) {
    setContactMergeSelections((current) => ({
      ...current,
      [groupId]: {
        ...(current[groupId] ?? {}),
        [field]: value,
      },
    }));
  }

  function renderOrganizationMergeAssistant(group: DuplicateGroup<OrganizationAuditRow>) {
    const preferredOrganizationId = getPreferredOrganizationId(group);
    const target =
      group.members.find((member) => member.organization.id === preferredOrganizationId)?.organization ??
      group.members[0]?.organization ??
      null;
    if (!target) {
      return null;
    }
    const sources = group.members
      .filter((member) => member.organization.id !== preferredOrganizationId)
      .map((member) => member.organization);
    const selections = organizationMergeSelections[group.id] ?? {};
    const preview = resolveOrganizationMergePayload(target, sources, selections);
    const diffRows = buildOrganizationMergeDiffRows(target, sources, selections);

    return (
      <div className="business-core-duplicates-merge-assistant">
        <div className="business-core-duplicates-merge-assistant__header">
          <strong>{language === "es" ? "Ajuste manual previo" : "Manual pre-merge adjustment"}</strong>
          <span>
            {language === "es"
              ? "Si quieres, elige explícitamente qué ficha aporta cada dato visible antes de consolidar."
              : "If needed, explicitly choose which record provides each visible field before consolidating."}
          </span>
        </div>
        <div className="business-core-duplicates-merge-assistant__grid">
          {ORGANIZATION_MERGE_FIELDS.map((field) => (
            <label key={`${group.id}-${field}`} className="business-core-duplicates-merge-assistant__field">
              <span>{getOrganizationMergeFieldLabel(field)}</span>
              <select
                className="form-select form-select-sm"
                value={selections[field] ?? "auto"}
                onChange={(event) =>
                  updateOrganizationMergeSelection(group.id, field, event.target.value)
                }
              >
                <option value="auto">
                  {language === "es" ? "Automático sugerido" : "Suggested automatic"}
                </option>
                {[target, ...sources].map((organization) => {
                  const fieldValue = getMeaningfulText(getOrganizationFieldValue(organization, field));
                  return (
                    <option key={`${field}-${organization.id}`} value={`organization:${organization.id}`}>
                      {`${getClientName(organization, language)} · ${fieldValue ?? (language === "es" ? "sin dato" : "no value")}`}
                    </option>
                  );
                })}
              </select>
            </label>
          ))}
        </div>
        <div className="business-core-duplicates-merge-assistant__preview">
          <div className="business-core-cell__meta">
            {language === "es"
              ? "Vista previa del documento objetivo"
              : "Target document preview"}
          </div>
          <div className="business-core-duplicates-group__summary">
            <span>{preview.name}</span>
            {preview.legal_name ? <span>{preview.legal_name}</span> : null}
            {preview.tax_id ? <span>{preview.tax_id}</span> : null}
            {preview.phone ? <span>{preview.phone}</span> : null}
            {preview.email ? <span>{preview.email}</span> : null}
            {preview.notes ? (
              <span>{language === "es" ? "notas integradas" : "merged notes"}</span>
            ) : null}
          </div>
        </div>
        <div className="business-core-duplicates-merge-assistant__diff">
          <div className="business-core-cell__meta">
            {language === "es" ? "Diff final por campo" : "Final field diff"}
          </div>
          <div className="business-core-duplicates-merge-diff-list">
            {diffRows.map((row) => (
              <div
                key={`${group.id}-${row.field}`}
                className={`business-core-duplicates-merge-diff-item${row.isChanged ? " is-changed" : ""}`}
              >
                <div className="business-core-duplicates-merge-diff-item__field">
                  {getOrganizationMergeFieldLabel(row.field)}
                </div>
                <div className="business-core-duplicates-merge-diff-item__values">
                  <span>
                    {language === "es" ? "Actual:" : "Current:"} {row.currentValue ?? "—"}
                  </span>
                  <span>
                    {language === "es" ? "Final:" : "Final:"} {row.nextValue ?? "—"}
                  </span>
                </div>
                <div className="business-core-duplicates-merge-diff-item__meta">
                  {row.isAutomatic
                    ? language === "es"
                      ? "origen automático"
                      : "automatic source"
                    : `${language === "es" ? "origen manual" : "manual source"}: ${row.sourceLabel ?? "—"}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderClientMergeAssistant(group: DuplicateGroup<ClientAuditRow>) {
    const preferredClientId = getPreferredClientId(group);
    const target =
      group.members.find((member) => member.client.id === preferredClientId)?.client ??
      group.members[0]?.client ??
      null;
    if (!target) {
      return null;
    }
    const sources = group.members
      .filter((member) => member.client.id !== preferredClientId)
      .map((member) => member.client);
    const selections = clientMergeSelections[group.id] ?? {};
    const preview = resolveClientMergePayload(target, sources, selections);
    const diffRows = buildClientMergeDiffRows(target, sources, selections, language);

    return (
      <div className="business-core-duplicates-merge-assistant">
        <div className="business-core-duplicates-merge-assistant__header">
          <strong>{language === "es" ? "Ajuste manual previo" : "Manual pre-merge adjustment"}</strong>
          <span>
            {language === "es"
              ? "Si quieres, decide qué ficha cliente aporta el estado comercial y las notas visibles antes de consolidar."
              : "If needed, decide which client record provides the commercial status and visible notes before consolidating."}
          </span>
        </div>
        <div className="business-core-duplicates-merge-assistant__grid">
          {CLIENT_MERGE_FIELDS.map((field) => (
            <label key={`${group.id}-${field}`} className="business-core-duplicates-merge-assistant__field">
              <span>{getClientMergeFieldLabel(field, language)}</span>
              <select
                className="form-select form-select-sm"
                value={selections[field] ?? "auto"}
                onChange={(event) =>
                  updateClientMergeSelection(group.id, field, event.target.value)
                }
              >
                <option value="auto">
                  {language === "es" ? "Automático sugerido" : "Suggested automatic"}
                </option>
                {[target, ...sources].map((client) => {
                  const fieldValue = getClientFieldDisplayValue(
                    getClientFieldValue(client, field),
                    field,
                    language
                  );
                  return (
                    <option key={`${field}-${client.id}`} value={`client:${client.id}`}>
                      {`#${client.id} · ${fieldValue ?? (language === "es" ? "sin dato" : "no value")}`}
                    </option>
                  );
                })}
              </select>
            </label>
          ))}
        </div>
        <div className="business-core-duplicates-merge-assistant__preview">
          <div className="business-core-cell__meta">
            {language === "es"
              ? "Vista previa de la ficha cliente objetivo"
              : "Target client record preview"}
          </div>
          <div className="business-core-duplicates-group__summary">
            <span>
              {getClientServiceStatusLabel(preview.service_status, language) ??
                (language === "es" ? "sin estado" : "no status")}
            </span>
            {preview.commercial_notes ? (
              <span>{language === "es" ? "notas integradas" : "merged notes"}</span>
            ) : null}
          </div>
        </div>
        <div className="business-core-duplicates-merge-assistant__diff">
          <div className="business-core-cell__meta">
            {language === "es" ? "Diff final por campo" : "Final field diff"}
          </div>
          <div className="business-core-duplicates-merge-diff-list">
            {diffRows.map((row) => (
              <div
                key={`${group.id}-${row.field}`}
                className={`business-core-duplicates-merge-diff-item${row.isChanged ? " is-changed" : ""}`}
              >
                <div className="business-core-duplicates-merge-diff-item__field">
                  {getClientMergeFieldLabel(row.field, language)}
                </div>
                <div className="business-core-duplicates-merge-diff-item__values">
                  <span>
                    {language === "es" ? "Actual:" : "Current:"} {row.currentValue ?? "—"}
                  </span>
                  <span>
                    {language === "es" ? "Final:" : "Final:"} {row.nextValue ?? "—"}
                  </span>
                </div>
                <div className="business-core-duplicates-merge-diff-item__meta">
                  {row.isAutomatic
                    ? language === "es"
                      ? "origen automático"
                      : "automatic source"
                    : `${language === "es" ? "origen manual" : "manual source"}: ${row.sourceLabel ?? "—"}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderSiteMergeAssistant(group: DuplicateGroup<SiteAuditRow>) {
    const preferredSiteId = getPreferredSiteId(group);
    const target =
      group.members.find((member) => member.site.id === preferredSiteId)?.site ??
      group.members[0]?.site ??
      null;
    if (!target) {
      return null;
    }
    const sources = group.members
      .filter((member) => member.site.id !== preferredSiteId)
      .map((member) => member.site);
    const selections = siteMergeSelections[group.id] ?? {};
    const preview = resolveSiteMergePayload(target, sources, selections);
    const diffRows = buildSiteMergeDiffRows(target, sources, selections, language);

    return (
      <div className="business-core-duplicates-merge-assistant">
        <div className="business-core-duplicates-merge-assistant__header">
          <strong>{language === "es" ? "Ajuste manual previo" : "Manual pre-merge adjustment"}</strong>
          <span>
            {language === "es"
              ? "Si quieres, decide qué dirección aporta cada dato visible antes de consolidar."
              : "If needed, decide which address provides each visible field before consolidating."}
          </span>
        </div>
        <div className="business-core-duplicates-merge-assistant__grid">
          {SITE_MERGE_FIELDS.map((field) => (
            <label key={`${group.id}-${field}`} className="business-core-duplicates-merge-assistant__field">
              <span>{getSiteMergeFieldLabel(field, language)}</span>
              <select
                className="form-select form-select-sm"
                value={selections[field] ?? "auto"}
                onChange={(event) =>
                  updateSiteMergeSelection(group.id, field, event.target.value)
                }
              >
                <option value="auto">
                  {language === "es" ? "Automático sugerido" : "Suggested automatic"}
                </option>
                {[target, ...sources].map((site) => {
                  const fieldValue = getSiteFieldDisplayValue(
                    getSiteFieldValue(site, field),
                    field
                  );
                  return (
                    <option key={`${field}-${site.id}`} value={`site:${site.id}`}>
                      {`${getVisibleAddressLabel(site)} · ${fieldValue ?? (language === "es" ? "sin dato" : "no value")}`}
                    </option>
                  );
                })}
              </select>
            </label>
          ))}
        </div>
        <div className="business-core-duplicates-merge-assistant__preview">
          <div className="business-core-cell__meta">
            {language === "es"
              ? "Vista previa de la dirección objetivo"
              : "Target address preview"}
          </div>
          <div className="business-core-duplicates-group__summary">
            {preview.address_line ? <span>{preview.address_line}</span> : null}
            {preview.commune ? <span>{preview.commune}</span> : null}
            {preview.city ? <span>{preview.city}</span> : null}
            {preview.region ? <span>{preview.region}</span> : null}
            {preview.reference_notes ? (
              <span>{language === "es" ? "notas integradas" : "merged notes"}</span>
            ) : null}
          </div>
        </div>
        <div className="business-core-duplicates-merge-assistant__diff">
          <div className="business-core-cell__meta">
            {language === "es" ? "Diff final por campo" : "Final field diff"}
          </div>
          <div className="business-core-duplicates-merge-diff-list">
            {diffRows.map((row) => (
              <div
                key={`${group.id}-${row.field}`}
                className={`business-core-duplicates-merge-diff-item${row.isChanged ? " is-changed" : ""}`}
              >
                <div className="business-core-duplicates-merge-diff-item__field">
                  {getSiteMergeFieldLabel(row.field, language)}
                </div>
                <div className="business-core-duplicates-merge-diff-item__values">
                  <span>
                    {language === "es" ? "Actual:" : "Current:"} {row.currentValue ?? "—"}
                  </span>
                  <span>
                    {language === "es" ? "Final:" : "Final:"} {row.nextValue ?? "—"}
                  </span>
                </div>
                <div className="business-core-duplicates-merge-diff-item__meta">
                  {row.isAutomatic
                    ? language === "es"
                      ? "origen automático"
                      : "automatic source"
                    : `${language === "es" ? "origen manual" : "manual source"}: ${row.sourceLabel ?? "—"}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderContactMergeAssistant(group: DuplicateGroup<ContactAuditRow>) {
    const preferredContactId = getPreferredContactId(group);
    const target =
      group.members.find((member) => member.contact.id === preferredContactId)?.contact ??
      group.members[0]?.contact ??
      null;
    if (!target) {
      return null;
    }
    const sources = group.members
      .filter((member) => member.contact.id !== preferredContactId)
      .map((member) => member.contact);
    const selections = contactMergeSelections[group.id] ?? {};
    const preview = resolveContactMergePayload(target, sources, selections);
    const diffRows = buildContactMergeDiffRows(target, sources, selections, language);

    return (
      <div className="business-core-duplicates-merge-assistant">
        <div className="business-core-duplicates-merge-assistant__header">
          <strong>{language === "es" ? "Ajuste manual previo" : "Manual pre-merge adjustment"}</strong>
          <span>
            {language === "es"
              ? "Si quieres, elige qué contacto aporta cada dato visible antes de consolidar."
              : "If needed, choose which contact provides each visible field before consolidating."}
          </span>
        </div>
        <div className="business-core-duplicates-merge-assistant__grid">
          {CONTACT_MERGE_FIELDS.map((field) => (
            <label key={`${group.id}-${field}`} className="business-core-duplicates-merge-assistant__field">
              <span>{getContactMergeFieldLabel(field, language)}</span>
              <select
                className="form-select form-select-sm"
                value={selections[field] ?? "auto"}
                onChange={(event) =>
                  updateContactMergeSelection(group.id, field, event.target.value)
                }
              >
                <option value="auto">
                  {language === "es" ? "Automático sugerido" : "Suggested automatic"}
                </option>
                {[target, ...sources].map((contact) => {
                  const fieldValue = getContactFieldDisplayValue(
                    getContactFieldValue(contact, field),
                    field,
                    language
                  );
                  return (
                    <option key={`${field}-${contact.id}`} value={`contact:${contact.id}`}>
                      {`${stripLegacyVisibleText(contact.full_name) || `#${contact.id}`} · ${fieldValue ?? (language === "es" ? "sin dato" : "no value")}`}
                    </option>
                  );
                })}
              </select>
            </label>
          ))}
        </div>
        <div className="business-core-duplicates-merge-assistant__preview">
          <div className="business-core-cell__meta">
            {language === "es"
              ? "Vista previa del contacto objetivo"
              : "Target contact preview"}
          </div>
          <div className="business-core-duplicates-group__summary">
            <span>{preview.full_name}</span>
            {preview.email ? <span>{preview.email}</span> : null}
            {preview.phone ? <span>{preview.phone}</span> : null}
            {preview.role_title ? <span>{preview.role_title}</span> : null}
            <span>
              {preview.is_primary
                ? language === "es"
                  ? "quedará principal"
                  : "will remain primary"
                : language === "es"
                  ? "quedará secundario"
                  : "will remain secondary"}
            </span>
          </div>
        </div>
        <div className="business-core-duplicates-merge-assistant__diff">
          <div className="business-core-cell__meta">
            {language === "es" ? "Diff final por campo" : "Final field diff"}
          </div>
          <div className="business-core-duplicates-merge-diff-list">
            {diffRows.map((row) => (
              <div
                key={`${group.id}-${row.field}`}
                className={`business-core-duplicates-merge-diff-item${row.isChanged ? " is-changed" : ""}`}
              >
                <div className="business-core-duplicates-merge-diff-item__field">
                  {getContactMergeFieldLabel(row.field, language)}
                </div>
                <div className="business-core-duplicates-merge-diff-item__values">
                  <span>
                    {language === "es" ? "Actual:" : "Current:"} {row.currentValue ?? "—"}
                  </span>
                  <span>
                    {language === "es" ? "Final:" : "Final:"} {row.nextValue ?? "—"}
                  </span>
                </div>
                <div className="business-core-duplicates-merge-diff-item__meta">
                  {row.isAutomatic
                    ? language === "es"
                      ? "origen automático"
                      : "automatic source"
                    : `${language === "es" ? "origen manual" : "manual source"}: ${row.sourceLabel ?? "—"}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderOrganizationGroup(group: DuplicateGroup<OrganizationAuditRow>) {
    const preferredOrganizationId = getPreferredOrganizationId(group);
    const sourceMembers = group.members.filter(
      (member) => member.organization.id !== preferredOrganizationId
    );
    const summary = summarizeOrganizationMerge(
      group,
      contactsByOrganizationId,
      clientRowById,
      organizationMergeSelections[group.id] ?? {}
    );
    return (
      <div key={group.id} className="business-core-duplicates-group">
        <div className="business-core-duplicates-group__header">
          <div>
            <h3 className="business-core-duplicates-group__title">
              {language === "es" ? group.titleEs : group.titleEn}
            </h3>
            <p className="business-core-duplicates-group__subtitle">
              {language === "es" ? group.subtitleEs : group.subtitleEn}
            </p>
            <div className="business-core-duplicates-group__summary">
              <span>
                {sourceMembers.length} {language === "es" ? "organizaciones origen" : "source organizations"}
              </span>
              <span>
                {summary.documentFieldsToMerge} {language === "es" ? "campos documentales a integrar" : "documentary fields to merge"}
              </span>
              <span>
                {summary.contactsToMove} {language === "es" ? "contactos a mover" : "contacts to move"}
              </span>
              <span>
                {summary.contactsToDeactivate} {language === "es" ? "contactos a desactivar" : "contacts to deactivate"}
              </span>
              <span>
                {summary.clientReassignments} {language === "es" ? "clientes a reasignar" : "clients to reassign"}
              </span>
              <span>
                {summary.clientsToConsolidate} {language === "es" ? "clientes a consolidar" : "clients to consolidate"}
              </span>
              <span>
                {summary.sitesToMove} {language === "es" ? "direcciones a mover" : "addresses to move"}
              </span>
              <span>
                {summary.workOrdersToMove} {language === "es" ? "OT a mover" : "work orders to move"}
              </span>
              {summary.clientsToConsolidate > 0 ? (
                <span>
                  {summary.clientsToConsolidate} {language === "es" ? "clientes en conflicto" : "conflicting clients"}
                </span>
              ) : null}
            </div>
          </div>
          <div className="business-core-duplicates-group__header-actions">
            <AppBadge tone="warning">
              {group.members.length} {language === "es" ? "organizaciones" : "organizations"}
            </AppBadge>
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              disabled={isMutating || group.members.length < 2}
              onClick={() => void handleMergeOrganizationGroup(group)}
            >
              {language === "es" ? "Consolidar en sugerida" : "Consolidate into suggested"}
            </button>
          </div>
        </div>
        {summary.clientsToConsolidate > 0 ? (
          <div className="business-core-cell__meta text-warning mb-3">
            {language === "es"
              ? "Este grupo tiene más de un cliente asociado. La consolidación guiada resolverá primero esa capa y luego fusionará la organización base sugerida."
              : "This group has more than one linked client. Guided consolidation will resolve that layer first and then merge the suggested base organization."}
          </div>
        ) : null}
        {renderOrganizationMergeAssistant(group)}
        <div className="business-core-duplicates-list">
          {group.members.map((member) => {
            const isPreferred = member.organization.id === preferredOrganizationId;
            const canDelete = !member.client && member.contactsCount === 0;
            const canDeactivate = !member.client && member.organization.is_active;
            return (
              <div key={member.organization.id} className="business-core-duplicates-item">
                <div className="business-core-duplicates-item__body">
                  <div className="business-core-cell__title">
                    {getClientName(member.organization, language)}
                  </div>
                  <div className="business-core-cell__meta">
                    {member.organization.tax_id ||
                      (language === "es" ? "sin RUT" : "no tax ID")}
                  </div>
                  <div className="business-core-cell__meta">
                    {[member.organization.phone, member.organization.email]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                  {isPreferred ? (
                    <div className="business-core-duplicates-recommendation">
                      <AppBadge tone="info">
                        {language === "es" ? "Sugerida para conservar" : "Suggested to keep"}
                      </AppBadge>
                      <span>
                        {language === "es"
                          ? "Es la contraparte con más trazabilidad operativa o mejor completitud visible."
                          : "It is the counterpart with more operational traceability or better visible completeness."}
                      </span>
                    </div>
                  ) : null}
                  <div className="business-core-duplicates-impact">
                    <AppBadge tone={member.organization.is_active ? "success" : "neutral"}>
                      {member.organization.is_active
                        ? language === "es"
                          ? "activa"
                          : "active"
                        : language === "es"
                          ? "inactiva"
                          : "inactive"}
                    </AppBadge>
                    {member.client ? (
                      <AppBadge tone="info">
                        {language === "es" ? "con cliente" : "with client"}
                      </AppBadge>
                    ) : null}
                    <span>{member.contactsCount} {language === "es" ? "contactos" : "contacts"}</span>
                    <span>{member.sitesCount} {language === "es" ? "direcciones" : "addresses"}</span>
                    <span>{member.workOrdersCount} OT</span>
                  </div>
                </div>
                <div className="business-core-duplicates-item__actions">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={() => navigate("/tenant-portal/business-core/organizations")}
                  >
                    {language === "es" ? "Ver catálogo" : "Open catalog"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    type="button"
                    disabled={!canDelete || isMutating}
                    onClick={() => void handleDeleteOrganization(member)}
                  >
                    {language === "es" ? "Eliminar" : "Delete"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-warning"
                    type="button"
                    disabled={isPreferred || !canDeactivate || isMutating}
                    onClick={() => void handleDeactivateOrganization(member)}
                  >
                    {language === "es" ? "Desactivar" : "Deactivate"}
                  </button>
                  {!canDelete ? (
                    <div className="business-core-cell__meta text-warning">
                      {member.client
                        ? language === "es"
                          ? "Tiene cliente asociado; consolida primero antes de borrar o desactivar."
                          : "It has a linked client; consolidate first before deleting or deactivating."
                        : language === "es"
                          ? "Tiene contactos asociados; conviene consolidarlos o moverlos antes de borrar."
                          : "It has linked contacts; it is better to consolidate or move them before deleting."}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderClientGroup(group: DuplicateGroup<ClientAuditRow>) {
    const preferredClientId = getPreferredClientId(group);
    const sourceMembers = group.members.filter((member) => member.client.id !== preferredClientId);
    const selections = clientMergeSelections[group.id] ?? {};
    const mergeSitesCount = sourceMembers.reduce(
      (total, source) => total + sites.filter((site) => site.client_id === source.client.id).length,
      0
    );
    const mergeWorkOrdersCount = sourceMembers.reduce(
      (total, source) =>
        total + workOrders.filter((workOrder) => workOrder.client_id === source.client.id).length,
      0
    );
    const { contactsToMove, contactsToDeactivate, sourceOrganizations } =
      summarizeClientContactMerge(group, contactsByOrganizationId);
    const documentFieldsToMerge = (() => {
      const target = group.members.find((member) => member.client.id === preferredClientId);
      if (!target) {
        return 0;
      }
      return countClientDocumentFieldsToMerge(
        target.client,
        sourceMembers.map((member) => member.client),
        selections
      );
    })();
    return (
      <div key={group.id} className="business-core-duplicates-group">
        <div className="business-core-duplicates-group__header">
          <div>
            <h3 className="business-core-duplicates-group__title">
              {language === "es" ? group.titleEs : group.titleEn}
            </h3>
            <p className="business-core-duplicates-group__subtitle">
              {language === "es" ? group.subtitleEs : group.subtitleEn}
            </p>
            <div className="business-core-duplicates-group__summary">
              <span>
                {sourceMembers.length} {language === "es" ? "fichas origen" : "source records"}
              </span>
              <span>
                {sourceOrganizations} {language === "es" ? "organizaciones origen" : "source organizations"}
              </span>
              <span>
                {contactsToMove} {language === "es" ? "contactos a mover" : "contacts to move"}
              </span>
              <span>
                {contactsToDeactivate} {language === "es" ? "contactos a desactivar" : "contacts to deactivate"}
              </span>
              <span>
                {documentFieldsToMerge} {language === "es" ? "campos documentales a integrar" : "documentary fields to merge"}
              </span>
              <span>
                {mergeSitesCount} {language === "es" ? "direcciones a mover" : "addresses to move"}
              </span>
              <span>
                {mergeWorkOrdersCount} {language === "es" ? "OT a mover" : "work orders to move"}
              </span>
            </div>
          </div>
          <div className="business-core-duplicates-group__header-actions">
            <AppBadge tone="warning">
              {group.members.length} {language === "es" ? "fichas" : "records"}
            </AppBadge>
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              disabled={isMutating || group.members.length < 2}
              onClick={() => void handleMergeClientGroup(group)}
            >
              {language === "es" ? "Consolidar en sugerida" : "Consolidate into suggested"}
            </button>
          </div>
        </div>
        {renderClientMergeAssistant(group)}
        <div className="business-core-duplicates-list">
          {group.members.map((member) => {
            const isPreferred = member.client.id === preferredClientId;
            const canDelete =
              member.sitesCount === 0 &&
              member.installationsCount === 0 &&
              member.workOrdersCount === 0;
            return (
              <div key={member.client.id} className="business-core-duplicates-item">
                <div className="business-core-duplicates-item__body">
                  <div className="business-core-cell__title">
                    {getClientName(member.organization, language)}
                  </div>
                  <div className="business-core-cell__meta">
                    {member.organization?.tax_id ||
                      (language === "es" ? "sin RUT" : "no tax ID")}
                  </div>
                  <div className="business-core-cell__meta">
                    {member.primarySite
                      ? getVisibleAddressLabel(member.primarySite)
                      : language === "es"
                        ? "sin dirección principal"
                        : "no primary address"}
                  </div>
                  {isPreferred ? (
                    <div className="business-core-duplicates-recommendation">
                      <AppBadge tone="info">
                        {language === "es" ? "Sugerida para conservar" : "Suggested to keep"}
                      </AppBadge>
                      <span>
                        {language === "es"
                          ? "Concentra más trazabilidad o mejor completitud visible."
                          : "It concentrates more traceability or better visible completeness."}
                      </span>
                    </div>
                  ) : null}
                  <div className="business-core-duplicates-impact">
                    <AppBadge tone={member.client.is_active ? "success" : "neutral"}>
                      {member.client.is_active
                        ? language === "es"
                          ? "activo"
                          : "active"
                        : language === "es"
                          ? "inactivo"
                          : "inactive"}
                    </AppBadge>
                    <span>{member.contactsCount} {language === "es" ? "contactos" : "contacts"}</span>
                    <span>{member.sitesCount} {language === "es" ? "direcciones" : "addresses"}</span>
                    <span>{member.installationsCount} {language === "es" ? "instalaciones" : "installations"}</span>
                    <span>{member.workOrdersCount} OT</span>
                  </div>
                </div>
                <div className="business-core-duplicates-item__actions">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => navigate(`/tenant-portal/business-core/clients/${member.client.id}`)}
                  >
                    {language === "es" ? "Abrir ficha" : "Open detail"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    type="button"
                    disabled={!canDelete || isMutating}
                    onClick={() => void handleDeleteClient(member)}
                  >
                    {language === "es" ? "Eliminar" : "Delete"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-warning"
                    type="button"
                    disabled={isPreferred || !member.client.is_active || isMutating}
                    onClick={() => void handleDeactivateClient(member)}
                  >
                    {language === "es" ? "Desactivar" : "Deactivate"}
                  </button>
                  {!canDelete ? (
                    <div className="business-core-cell__meta text-warning">
                      {language === "es"
                        ? "Tiene dependencias; desactiva en vez de borrar."
                        : "It has linked records; deactivate instead of deleting."}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderContactGroup(group: DuplicateGroup<ContactAuditRow>) {
    const preferredContactId = getPreferredContactId(group);
    const sourceMembers = group.members.filter((member) => member.contact.id !== preferredContactId);
    const selections = contactMergeSelections[group.id] ?? {};
    const { documentFieldsToMerge, primarySourcesCount } = summarizeContactDocumentMerge(
      group,
      selections
    );
    return (
      <div key={group.id} className="business-core-duplicates-group">
        <div className="business-core-duplicates-group__header">
          <div>
            <h3 className="business-core-duplicates-group__title">
              {language === "es" ? group.titleEs : group.titleEn}
            </h3>
            <p className="business-core-duplicates-group__subtitle">
              {language === "es" ? group.subtitleEs : group.subtitleEn}
            </p>
            <div className="business-core-duplicates-group__summary">
              <span>
                {sourceMembers.length} {language === "es" ? "contactos origen" : "source contacts"}
              </span>
              <span>
                {documentFieldsToMerge} {language === "es" ? "campos a integrar" : "fields to merge"}
              </span>
              <span>
                {primarySourcesCount} {language === "es" ? "primarios a revisar" : "primary records to review"}
              </span>
            </div>
          </div>
          <div className="business-core-duplicates-group__header-actions">
            <AppBadge tone="warning">
              {group.members.length} {language === "es" ? "contactos" : "contacts"}
            </AppBadge>
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              disabled={isMutating || group.members.length < 2}
              onClick={() => void handleMergeContactGroup(group)}
            >
              {language === "es" ? "Consolidar en sugerida" : "Consolidate into suggested"}
            </button>
          </div>
        </div>
        {renderContactMergeAssistant(group)}
        <div className="business-core-duplicates-list">
          {group.members.map((member) => {
            const isPreferred = member.contact.id === preferredContactId;
            const canDelete = !member.contact.is_primary;
            return (
              <div key={member.contact.id} className="business-core-duplicates-item">
                <div className="business-core-duplicates-item__body">
                  <div className="business-core-cell__title">{member.contact.full_name}</div>
                  <div className="business-core-cell__meta">
                    {member.organization
                      ? getClientName(member.organization, language)
                      : language === "es"
                        ? "sin organización"
                        : "no organization"}
                  </div>
                  <div className="business-core-cell__meta">
                    {[member.contact.email, member.contact.phone, member.contact.role_title]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                  {isPreferred ? (
                    <div className="business-core-duplicates-recommendation">
                      <AppBadge tone="info">
                        {language === "es" ? "Sugerida para conservar" : "Suggested to keep"}
                      </AppBadge>
                      <span>
                        {language === "es"
                          ? "Es el contacto con mejor completitud visible o rol principal dentro de la organización."
                          : "It is the contact with better visible completeness or the main role inside the organization."}
                      </span>
                    </div>
                  ) : null}
                  <div className="business-core-duplicates-impact">
                    <AppBadge tone={member.contact.is_active ? "success" : "neutral"}>
                      {member.contact.is_active
                        ? language === "es"
                          ? "activo"
                          : "active"
                        : language === "es"
                          ? "inactivo"
                          : "inactive"}
                    </AppBadge>
                    {member.contact.is_primary ? (
                      <AppBadge tone="info">
                        {language === "es" ? "principal" : "primary"}
                      </AppBadge>
                    ) : null}
                    {member.client ? (
                      <span>{language === "es" ? "ligado a cliente" : "linked to client"}</span>
                    ) : (
                      <span>{language === "es" ? "sin cliente activo" : "no active client"}</span>
                    )}
                  </div>
                </div>
                <div className="business-core-duplicates-item__actions">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={() => navigate("/tenant-portal/business-core/contacts")}
                  >
                    {language === "es" ? "Ver catálogo" : "Open catalog"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    type="button"
                    disabled={!canDelete || isMutating}
                    onClick={() => void handleDeleteContact(member)}
                  >
                    {language === "es" ? "Eliminar" : "Delete"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-warning"
                    type="button"
                    disabled={isPreferred || !member.contact.is_active || isMutating}
                    onClick={() => void handleDeactivateContact(member)}
                  >
                    {language === "es" ? "Desactivar" : "Deactivate"}
                  </button>
                  {!canDelete ? (
                    <div className="business-core-cell__meta text-warning">
                      {language === "es"
                        ? "Si es el contacto principal, conviene conservarlo o consolidarlo antes de borrar."
                        : "If it is the primary contact, it is better to keep or consolidate it before deleting."}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSiteGroup(group: DuplicateGroup<SiteAuditRow>) {
    const preferredSiteId = getPreferredSiteId(group);
    const sourceMembers = group.members.filter((member) => member.site.id !== preferredSiteId);
    const selections = siteMergeSelections[group.id] ?? {};
    const mergeInstallationsCount = sourceMembers.reduce(
      (total, source) =>
        total + installations.filter((item) => item.site_id === source.site.id).length,
      0
    );
    const mergeWorkOrdersCount = sourceMembers.reduce(
      (total, source) =>
        total + workOrders.filter((workOrder) => workOrder.site_id === source.site.id).length,
      0
    );
    const documentFieldsToMerge = (() => {
      const target = group.members.find((member) => member.site.id === preferredSiteId);
      if (!target) {
        return 0;
      }
      return countSiteDocumentFieldsToMerge(
        target.site,
        sourceMembers.map((member) => member.site),
        selections
      );
    })();
    return (
      <div key={group.id} className="business-core-duplicates-group">
        <div className="business-core-duplicates-group__header">
          <div>
            <h3 className="business-core-duplicates-group__title">
              {language === "es" ? group.titleEs : group.titleEn}
            </h3>
            <p className="business-core-duplicates-group__subtitle">
              {language === "es" ? group.subtitleEs : group.subtitleEn}
            </p>
            <div className="business-core-duplicates-group__summary">
              <span>
                {sourceMembers.length} {language === "es" ? "sitios origen" : "source sites"}
              </span>
              <span>
                {mergeInstallationsCount} {language === "es" ? "instalaciones a mover" : "installations to move"}
              </span>
              <span>
                {documentFieldsToMerge} {language === "es" ? "campos documentales a integrar" : "documentary fields to merge"}
              </span>
              <span>
                {mergeWorkOrdersCount} {language === "es" ? "OT a mover" : "work orders to move"}
              </span>
            </div>
          </div>
          <div className="business-core-duplicates-group__header-actions">
            <AppBadge tone="warning">
              {group.members.length} {language === "es" ? "direcciones" : "addresses"}
            </AppBadge>
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              disabled={isMutating || group.members.length < 2}
              onClick={() => void handleMergeSiteGroup(group)}
            >
              {language === "es" ? "Consolidar en sugerida" : "Consolidate into suggested"}
            </button>
          </div>
        </div>
        {renderSiteMergeAssistant(group)}
        <div className="business-core-duplicates-list">
          {group.members.map((member) => {
            const isPreferred = member.site.id === preferredSiteId;
            const canDelete =
              member.installationsCount === 0 && member.workOrdersCount === 0;
            return (
              <div key={member.site.id} className="business-core-duplicates-item">
                <div className="business-core-duplicates-item__body">
                  <div className="business-core-cell__title">{getVisibleAddressLabel(member.site)}</div>
                  <div className="business-core-cell__meta">
                    {getClientName(member.organization, language)}
                  </div>
                  <div className="business-core-cell__meta">
                    {[member.site.commune, member.site.city, member.site.region]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                  {isPreferred ? (
                    <div className="business-core-duplicates-recommendation">
                      <AppBadge tone="info">
                        {language === "es" ? "Sugerida para conservar" : "Suggested to keep"}
                      </AppBadge>
                      <span>
                        {language === "es"
                          ? "Es la dirección con mayor uso operativo o mejor completitud visible."
                          : "It is the address with more operational use or better visible completeness."}
                      </span>
                    </div>
                  ) : null}
                  <div className="business-core-duplicates-impact">
                    <AppBadge tone={member.site.is_active ? "success" : "neutral"}>
                      {member.site.is_active
                        ? language === "es"
                          ? "activa"
                          : "active"
                        : language === "es"
                          ? "inactiva"
                          : "inactive"}
                    </AppBadge>
                    <span>{member.installationsCount} {language === "es" ? "instalaciones" : "installations"}</span>
                    <span>{member.workOrdersCount} OT</span>
                  </div>
                </div>
                <div className="business-core-duplicates-item__actions">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={() => navigate("/tenant-portal/business-core/sites")}
                  >
                    {language === "es" ? "Ver catálogo" : "Open catalog"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    type="button"
                    disabled={!canDelete || isMutating}
                    onClick={() => void handleDeleteSite(member)}
                  >
                    {language === "es" ? "Eliminar" : "Delete"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-warning"
                    type="button"
                    disabled={isPreferred || !member.site.is_active || isMutating}
                    onClick={() => void handleDeactivateSite(member)}
                  >
                    {language === "es" ? "Desactivar" : "Deactivate"}
                  </button>
                  {!canDelete ? (
                    <div className="business-core-cell__meta text-warning">
                      {language === "es"
                        ? "Tiene instalaciones u OT asociadas."
                        : "It has linked installations or work orders."}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderInstallationGroup(group: DuplicateGroup<InstallationAuditRow>) {
    const preferredInstallationId = getPreferredInstallationId(group);
    const sourceMembers = group.members.filter(
      (member) => member.installation.id !== preferredInstallationId
    );
    const mergeWorkOrdersCount = sourceMembers.reduce(
      (total, source) =>
        total +
        workOrders.filter((workOrder) => workOrder.installation_id === source.installation.id).length,
      0
    );
    return (
      <div key={group.id} className="business-core-duplicates-group">
        <div className="business-core-duplicates-group__header">
          <div>
            <h3 className="business-core-duplicates-group__title">
              {language === "es" ? group.titleEs : group.titleEn}
            </h3>
            <p className="business-core-duplicates-group__subtitle">
              {language === "es" ? group.subtitleEs : group.subtitleEn}
            </p>
            <div className="business-core-duplicates-group__summary">
              <span>
                {sourceMembers.length} {language === "es" ? "instalaciones origen" : "source installations"}
              </span>
              <span>
                {mergeWorkOrdersCount} {language === "es" ? "OT a mover" : "work orders to move"}
              </span>
            </div>
          </div>
          <div className="business-core-duplicates-group__header-actions">
            <AppBadge tone="warning">
              {group.members.length} {language === "es" ? "instalaciones" : "installations"}
            </AppBadge>
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              disabled={isMutating || group.members.length < 2}
              onClick={() => void handleMergeInstallationGroup(group)}
            >
              {language === "es" ? "Consolidar en sugerida" : "Consolidate into suggested"}
            </button>
          </div>
        </div>
        <div className="business-core-duplicates-list">
          {group.members.map((member) => {
            const isPreferred = member.installation.id === preferredInstallationId;
            const canDelete = member.workOrdersCount === 0;
            return (
              <div key={member.installation.id} className="business-core-duplicates-item">
                <div className="business-core-duplicates-item__body">
                  <div className="business-core-cell__title">{member.installation.name}</div>
                  <div className="business-core-cell__meta">
                    {member.equipmentType?.name || `#${member.installation.equipment_type_id}`}
                    {member.installation.serial_number
                      ? ` · ${member.installation.serial_number}`
                      : ""}
                  </div>
                  <div className="business-core-cell__meta">
                    {member.site
                      ? getVisibleAddressLabel(member.site)
                      : language === "es"
                        ? "sin sitio"
                        : "no site"}
                  </div>
                  {isPreferred ? (
                    <div className="business-core-duplicates-recommendation">
                      <AppBadge tone="info">
                        {language === "es" ? "Sugerida para conservar" : "Suggested to keep"}
                      </AppBadge>
                      <span>
                        {language === "es"
                          ? "Es la instalación con mayor historial o mejor identidad técnica visible."
                          : "It is the installation with more history or better visible technical identity."}
                      </span>
                    </div>
                  ) : null}
                  <div className="business-core-duplicates-impact">
                    <AppBadge tone={member.installation.is_active ? "success" : "neutral"}>
                      {member.installation.is_active
                        ? language === "es"
                          ? "activa"
                          : "active"
                        : language === "es"
                          ? "inactiva"
                          : "inactive"}
                    </AppBadge>
                    <span>{member.workOrdersCount} OT</span>
                  </div>
                </div>
                <div className="business-core-duplicates-item__actions">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={() => navigate("/tenant-portal/maintenance/installations")}
                  >
                    {language === "es" ? "Ver catálogo" : "Open catalog"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    type="button"
                    disabled={!canDelete || isMutating}
                    onClick={() => void handleDeleteInstallation(member)}
                  >
                    {language === "es" ? "Eliminar" : "Delete"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-warning"
                    type="button"
                    disabled={isPreferred || !member.installation.is_active || isMutating}
                    onClick={() => void handleDeactivateInstallation(member)}
                  >
                    {language === "es" ? "Desactivar" : "Deactivate"}
                  </button>
                  {!canDelete ? (
                    <div className="business-core-cell__meta text-warning">
                      {language === "es"
                        ? "Tiene mantenciones asociadas."
                        : "It has linked work orders."}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Core de negocio" : "Business core"}
        icon="business-core"
        title={language === "es" ? "Depuración de duplicados" : "Duplicate cleanup"}
        description={
          language === "es"
            ? "Busca organizaciones, clientes, contactos, direcciones e instalaciones duplicadas y decide qué fichas pueden borrarse o consolidarse sin romper trazabilidad."
            : "Find duplicated organizations, clients, contacts, addresses, and installations and decide which records can be deleted or consolidated without breaking traceability."
        }
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Este corte audita duplicados por coincidencias exactas normalizadas y muestra dependencias para evitar borrados que rompan organizaciones base, mantenimiento, contactos principales o historial."
                  : "This slice audits duplicates by normalized exact matches and shows dependencies to avoid deletions that would break base organizations, maintenance, primary contacts, or history."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar la auditoría" : "The audit could not be loaded"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Buscando duplicados..." : "Scanning duplicates..."} />
      ) : null}

      <PanelCard
        title={language === "es" ? "Auditoría de duplicados" : "Duplicate audit"}
        subtitle={
          language === "es"
            ? "Filtro rápido para revisar grupos duplicados, sugerir qué ficha conviene conservar y dejar a mano las que pueden borrarse o desactivarse sin perder trazabilidad."
            : "Quick filter to review duplicate groups, suggest which record should stay, and keep visible the ones that can be deleted or deactivated without losing traceability."
        }
      >
        <div className="business-core-duplicates-toolbar">
          <input
            className="form-control business-core-search"
            type="search"
            placeholder={
              language === "es"
                ? "Buscar por organización, cliente, contacto, dirección, serie o instalación"
                : "Search by organization, client, contact, address, serial, or installation"
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="form-select business-core-duplicates-toolbar__select"
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value as DuplicateEntityKind | "all")}
          >
            <option value="all">{language === "es" ? "Todos los grupos" : "All groups"}</option>
            <option value="organizations">{language === "es" ? "Solo organizaciones" : "Organizations only"}</option>
            <option value="clients">{language === "es" ? "Solo clientes" : "Clients only"}</option>
            <option value="contacts">{language === "es" ? "Solo contactos" : "Contacts only"}</option>
            <option value="sites">{language === "es" ? "Solo direcciones" : "Addresses only"}</option>
            <option value="installations">{language === "es" ? "Solo instalaciones" : "Installations only"}</option>
          </select>
        </div>
        <div className="business-core-duplicates-metrics">
          <div className="business-core-duplicates-metric">
            <strong>{totalVisibleGroups}</strong>
            <span>{language === "es" ? "grupos visibles" : "visible groups"}</span>
          </div>
          <div className="business-core-duplicates-metric">
            <strong>{visibleOrganizationGroups.length}</strong>
            <span>{language === "es" ? "grupos de organizaciones" : "organization groups"}</span>
          </div>
          <div className="business-core-duplicates-metric">
            <strong>{visibleClientGroups.length}</strong>
            <span>{language === "es" ? "grupos de clientes" : "client groups"}</span>
          </div>
          <div className="business-core-duplicates-metric">
            <strong>{visibleContactGroups.length}</strong>
            <span>{language === "es" ? "grupos de contactos" : "contact groups"}</span>
          </div>
          <div className="business-core-duplicates-metric">
            <strong>{visibleSiteGroups.length}</strong>
            <span>{language === "es" ? "grupos de direcciones" : "address groups"}</span>
          </div>
          <div className="business-core-duplicates-metric">
            <strong>{visibleInstallationGroups.length}</strong>
            <span>{language === "es" ? "grupos de instalaciones" : "installation groups"}</span>
          </div>
          <div className="business-core-duplicates-metric">
            <strong>{safeDeleteCandidates}</strong>
            <span>{language === "es" ? "candidatas a borrar" : "delete candidates"}</span>
          </div>
        </div>
        <div className="business-core-duplicates-note">
          {language === "es"
            ? "La interfaz marca una ficha sugerida para conservar por grupo. Si la duplicada ya tiene historial, rol principal, cliente asociado o trazabilidad, conviene desactivarla o consolidarla hacia la sugerida; si está vacía, puedes borrarla."
            : "The interface marks one suggested record to keep per group. If the duplicate already has history, a primary role, a linked client, or traceability, it is better to deactivate it or consolidate it into the suggested one; if it is empty, you can delete it."}
        </div>
      </PanelCard>

      <PanelCard
        title={
          language === "es"
            ? "Historial reciente de consolidaciones"
            : "Recent consolidation history"
        }
        subtitle={
          language === "es"
            ? "Evidencia operativa de merges ya aplicados para no depender solo del estado actual de la base."
            : "Operational evidence of merges already applied so you do not depend only on the current database state."
        }
      >
        {visibleMergeAudits.length === 0 ? (
          <div className="business-core-cell__meta">
            {language === "es"
              ? "No hay consolidaciones recientes bajo el filtro actual."
              : "There are no recent consolidations under the current filter."}
          </div>
        ) : (
          <div className="business-core-merge-audits-list">
            {visibleMergeAudits.map((audit) => {
              const summaryPayload = getMergeAuditSummaryPayload(audit);
              const sourceIds = getMergeAuditSourceIds(audit);
              const diffRows = getMergeAuditDiffRows(audit).filter((row) => row.is_changed);
              const visibleDiffRows = diffRows.slice(0, 3);
              const manualSelectionCount = getMergeAuditManualSelectionCount(audit);

              return (
                <div key={audit.id} className="business-core-merge-audit-card">
                  <div className="business-core-merge-audit-card__header">
                    <div>
                      <div className="business-core-merge-audit-card__title">
                        {getMergeAuditPrimaryLabel(audit)}
                      </div>
                      <div className="business-core-merge-audit-card__meta">
                        {formatMergeAuditTimestamp(audit.created_at, language)} ·{" "}
                        {audit.requested_by_email ||
                          (language === "es" ? "usuario no informado" : "unknown user")}
                      </div>
                    </div>
                    <AppBadge tone="info">
                      {getMergeAuditKindLabel(audit.entity_kind, language)}
                    </AppBadge>
                  </div>
                  <div className="business-core-merge-audit-card__summary">
                    <span>
                      {language === "es" ? "fuentes fusionadas" : "merged sources"}:{" "}
                      {sourceIds.length}
                    </span>
                    {summaryPayload
                      ? Object.entries(summaryPayload)
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <span key={key}>
                              {key.replace(/_/g, " ")}: {String(value)}
                            </span>
                          ))
                      : null}
                    {diffRows.length > 0 ? (
                      <span>
                        {language === "es" ? "campos documentados" : "documented fields"}:{" "}
                        {diffRows.length}
                      </span>
                    ) : null}
                    {manualSelectionCount > 0 ? (
                      <span>
                        {language === "es" ? "ajustes manuales" : "manual overrides"}:{" "}
                        {manualSelectionCount}
                      </span>
                    ) : null}
                  </div>
                  {visibleDiffRows.length > 0 ? (
                    <div className="business-core-merge-audit-card__diffs">
                      <div className="business-core-merge-audit-card__section-title">
                        {language === "es"
                          ? "Cambios documentales relevantes"
                          : "Relevant documented changes"}
                      </div>
                      <div className="business-core-merge-audit-diff-list">
                        {visibleDiffRows.map((row) => (
                          <div
                            key={`${audit.id}-${row.field}`}
                            className="business-core-merge-audit-diff-row"
                          >
                            <div className="business-core-merge-audit-diff-row__header">
                              <span>{getMergeAuditFieldLabel(audit, row.field, language)}</span>
                              <AppBadge tone={row.is_automatic ? "neutral" : "info"}>
                                {row.is_automatic
                                  ? language === "es"
                                    ? "auto"
                                    : "auto"
                                  : language === "es"
                                    ? "manual"
                                    : "manual"}
                              </AppBadge>
                            </div>
                            <div className="business-core-merge-audit-diff-row__values">
                              <span>
                                {renderMergeAuditValue(row.current_value, language)}
                              </span>
                              <span aria-hidden="true">→</span>
                              <strong>
                                {renderMergeAuditValue(row.next_value, language)}
                              </strong>
                            </div>
                            {row.source_label ? (
                              <div className="business-core-merge-audit-diff-row__meta">
                                {row.is_automatic
                                  ? language === "es"
                                    ? `fuente sugerida: ${row.source_label}`
                                    : `suggested source: ${row.source_label}`
                                  : language === "es"
                                    ? `ajuste manual desde: ${row.source_label}`
                                    : `manual override from: ${row.source_label}`}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {diffRows.length > visibleDiffRows.length ? (
                        <div className="business-core-merge-audit-card__more">
                          {language === "es"
                            ? `+${diffRows.length - visibleDiffRows.length} cambio(s) adicionales en el payload`
                            : `+${diffRows.length - visibleDiffRows.length} additional change(s) in payload`}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Organizaciones duplicadas" : "Duplicate organizations"}
        subtitle={
          language === "es"
            ? "Revisión por RUT o por nombre + canal central, útil para consolidar la contraparte base antes de seguir con clientes o contactos."
            : "Review by tax ID or by name + main channel, useful to consolidate the base counterpart before continuing with clients or contacts."
        }
      >
        {visibleOrganizationGroups.length === 0 ? (
          <div className="business-core-cell__meta">
            {language === "es"
              ? "No se encontraron organizaciones duplicadas con el filtro actual."
              : "No duplicate organizations were found with the current filter."}
          </div>
        ) : (
          <div className="business-core-duplicates-stack">
            {visibleOrganizationGroups.map(renderOrganizationGroup)}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Clientes duplicados" : "Duplicate clients"}
        subtitle={
          language === "es"
            ? "Revisión por RUT o por nombre + dirección principal."
            : "Review by tax ID or by name + primary address."
        }
      >
        {visibleClientGroups.length === 0 ? (
          <div className="business-core-cell__meta">
            {language === "es"
              ? "No se encontraron clientes duplicados con el filtro actual."
              : "No duplicate clients were found with the current filter."}
          </div>
        ) : (
          <div className="business-core-duplicates-stack">
            {visibleClientGroups.map(renderClientGroup)}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Contactos duplicados" : "Duplicate contacts"}
        subtitle={
          language === "es"
            ? "Coincidencias exactas de nombre + canal de contacto dentro de la misma organización."
            : "Exact matches of name + contact channel inside the same organization."
        }
      >
        {visibleContactGroups.length === 0 ? (
          <div className="business-core-cell__meta">
            {language === "es"
              ? "No se encontraron contactos duplicados con el filtro actual."
              : "No duplicate contacts were found with the current filter."}
          </div>
        ) : (
          <div className="business-core-duplicates-stack">
            {visibleContactGroups.map(renderContactGroup)}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Direcciones duplicadas" : "Duplicate addresses"}
        subtitle={
          language === "es"
            ? "Coincidencias exactas de dirección visible dentro del mismo cliente."
            : "Exact matches of visible addresses inside the same client."
        }
      >
        {visibleSiteGroups.length === 0 ? (
          <div className="business-core-cell__meta">
            {language === "es"
              ? "No se encontraron direcciones duplicadas con el filtro actual."
              : "No duplicate addresses were found with the current filter."}
          </div>
        ) : (
          <div className="business-core-duplicates-stack">
            {visibleSiteGroups.map(renderSiteGroup)}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Instalaciones duplicadas" : "Duplicate installations"}
        subtitle={
          language === "es"
            ? "Coincidencias por serie o por identidad técnica dentro del mismo sitio."
            : "Matches by serial or technical identity inside the same site."
        }
      >
        {visibleInstallationGroups.length === 0 ? (
          <div className="business-core-cell__meta">
            {language === "es"
              ? "No se encontraron instalaciones duplicadas con el filtro actual."
              : "No duplicate installations were found with the current filter."}
          </div>
        ) : (
          <div className="business-core-duplicates-stack">
            {visibleInstallationGroups.map(renderInstallationGroup)}
          </div>
        )}
      </PanelCard>
    </div>
  );
}
