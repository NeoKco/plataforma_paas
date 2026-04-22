import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { pickLocalizedText, useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreHelpBubble } from "../components/common/BusinessCoreHelpBubble";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  createTenantBusinessClient,
  deleteTenantBusinessClient,
  getTenantBusinessClients,
  updateTenantBusinessClient,
  updateTenantBusinessClientStatus,
  type TenantBusinessClient,
  type TenantBusinessClientWriteRequest,
} from "../services/clientsService";
import {
  createTenantBusinessContact,
  getTenantBusinessContacts,
  updateTenantBusinessContact,
  type TenantBusinessContact,
  type TenantBusinessContactWriteRequest,
} from "../services/contactsService";
import {
  createTenantBusinessOrganization,
  getTenantBusinessOrganizations,
  updateTenantBusinessOrganization,
  type TenantBusinessOrganization,
  type TenantBusinessOrganizationWriteRequest,
} from "../services/organizationsService";
import {
  createTenantBusinessSite,
  getTenantBusinessSites,
  updateTenantBusinessSite,
  type TenantBusinessSite,
  type TenantBusinessSiteWriteRequest,
} from "../services/sitesService";
import {
  getTenantBusinessAssets,
  type TenantBusinessAsset,
} from "../services/assetsService";
import {
  getTenantSocialCommunityGroups,
  type TenantSocialCommunityGroup,
} from "../services/socialCommunityGroupsService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import {
  buildAddressLine,
  parseAddressLine,
} from "../utils/addressPresentation";
import {
  getClientSocialCommunityName,
} from "../utils/socialCommunityPresentation";

type ClientModalState = {
  mode: "create" | "edit";
  clientId: number | null;
  organizationId: number | null;
  primaryContactId: number | null;
  secondaryContactId: number | null;
  primaryAddressId: number | null;
};

type ClientModalForm = {
  organizationName: string;
  legalName: string;
  socialCommunityGroupId: string;
  taxId: string;
  phone: string;
  email: string;
  serviceStatus: string;
  commercialNotes: string;
  primaryContactName: string;
  primaryContactRole: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  secondaryContactName: string;
  secondaryContactRole: string;
  secondaryContactPhone: string;
  secondaryContactEmail: string;
  addressLine: string;
  addressStreet: string;
  addressNumber: string;
  commune: string;
  city: string;
  region: string;
  countryCode: string;
  referenceNotes: string;
};

type ClientRow = {
  client: TenantBusinessClient;
  organization: TenantBusinessOrganization | null;
  contacts: TenantBusinessContact[];
  addresses: TenantBusinessSite[];
};

type ClientAssetSummary = {
  totalAssets: number;
  activeAssets: number;
  inactiveAssets: number;
  sitesWithAssets: number;
  focusAddress: TenantBusinessSite | null;
};

type CommonOrganizationSummary = {
  totalDefinedClients: number;
  groupedOrganizations: number;
  pendingClients: number;
};

function metadataLabelForGroup(
  row: ClientRow,
  metadataByClientId: Map<number, { commonName: string | null; groupSize: number; isGrouped: boolean }>,
  t: (es: string, en: string) => string
) {
  const metadata = metadataByClientId.get(row.client.id) ?? null;
  if (!metadata?.commonName) {
    return t("sin grupo social operativo", "no operational social group");
  }
  return metadata.isGrouped
    ? t("grupo visible en cartera", "group visible in portfolio")
    : t("grupo asignado solo a esta ficha", "group assigned only to this record");
}

type DuplicateClientCandidate = {
  row: ClientRow;
  reasons: string[];
};

function buildDefaultModalForm(): ClientModalForm {
  return {
    organizationName: "",
    legalName: "",
    socialCommunityGroupId: "",
    taxId: "",
    phone: "",
    email: "",
    serviceStatus: "active",
    commercialNotes: "",
    primaryContactName: "",
    primaryContactRole: "",
    primaryContactPhone: "",
    primaryContactEmail: "",
    secondaryContactName: "",
    secondaryContactRole: "",
    secondaryContactPhone: "",
    secondaryContactEmail: "",
    addressLine: "",
    addressStreet: "",
    addressNumber: "",
    commune: "",
    city: "",
    region: "",
    countryCode: "CL",
    referenceNotes: "",
  };
}

function normalizeNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeHumanKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhoneKey(value: string | null | undefined): string {
  return (value ?? "").replace(/[^0-9+]/g, "").trim();
}

function normalizeEmailKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeTaxIdKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .trim();
}

function getNormalizedSocialCommunityName(
  client: TenantBusinessClient | null,
  organization: TenantBusinessOrganization | null,
  groupsById: Map<number, TenantSocialCommunityGroup>
): string | null {
  const groupName = getClientSocialCommunityName(client, organization, groupsById, {
    fallbackToLegacyLegalName: false,
  });
  if (!groupName) {
    return null;
  }
  return normalizeHumanKey(groupName) || null;
}

function buildGoogleMapsUrl(address: TenantBusinessSite): string | null {
  const query = [
    address.address_line,
    address.commune,
    address.city,
    address.region,
    address.country_code || "Chile",
  ]
    .filter(Boolean)
    .join(", ")
    .trim();
  if (!query) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

function buildOrganizationWritePayload(
  organization: TenantBusinessOrganization,
  overrides: Partial<TenantBusinessOrganization> = {}
): TenantBusinessOrganizationWriteRequest {
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
): TenantBusinessClientWriteRequest {
  return {
    organization_id: overrides.organization_id ?? client.organization_id,
    social_community_group_id:
      overrides.social_community_group_id ?? client.social_community_group_id,
    client_code: overrides.client_code ?? client.client_code,
    service_status: overrides.service_status ?? client.service_status,
    commercial_notes: overrides.commercial_notes ?? client.commercial_notes,
    is_active: overrides.is_active ?? client.is_active,
    sort_order: overrides.sort_order ?? client.sort_order,
  };
}

function buildContactWritePayload(
  contact: TenantBusinessContact,
  overrides: Partial<TenantBusinessContact> = {}
): TenantBusinessContactWriteRequest {
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

export function BusinessCoreClientsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const navigate = useNavigate();
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [socialCommunityGroups, setSocialCommunityGroups] = useState<TenantSocialCommunityGroup[]>([]);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [addresses, setAddresses] = useState<TenantBusinessSite[]>([]);
  const [assets, setAssets] = useState<TenantBusinessAsset[]>([]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ClientModalState | null>(null);
  const [modalForm, setModalForm] = useState<ClientModalForm>(buildDefaultModalForm());
  const [duplicateCandidate, setDuplicateCandidate] = useState<DuplicateClientCandidate | null>(
    null
  );

  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );
  const socialCommunityGroupById = useMemo(
    () => new Map(socialCommunityGroups.map((group) => [group.id, group])),
    [socialCommunityGroups]
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

  const addressesByClientId = useMemo(() => {
    const grouped = new Map<number, TenantBusinessSite[]>();
    addresses.forEach((address) => {
      const current = grouped.get(address.client_id) ?? [];
      current.push(address);
      grouped.set(address.client_id, current);
    });
    return grouped;
  }, [addresses]);

  const assetsBySiteId = useMemo(() => {
    const grouped = new Map<number, TenantBusinessAsset[]>();
    assets.forEach((asset) => {
      const current = grouped.get(asset.site_id) ?? [];
      current.push(asset);
      grouped.set(asset.site_id, current);
    });
    return grouped;
  }, [assets]);

  const clientRows = useMemo<ClientRow[]>(
    () =>
      clients.map((client) => ({
        client,
        organization: organizationById.get(client.organization_id) ?? null,
        contacts: contactsByOrganizationId.get(client.organization_id) ?? [],
        addresses: addressesByClientId.get(client.id) ?? [],
      })),
    [addressesByClientId, clients, contactsByOrganizationId, organizationById]
  );

  const clientRowById = useMemo(
    () => new Map(clientRows.map((row) => [row.client.id, row])),
    [clientRows]
  );

  const assetSummaryByClientId = useMemo(() => {
    const summary = new Map<number, ClientAssetSummary>();
    clientRows.forEach((row) => {
      const addressRows = row.addresses;
      const siteEntries = addressRows.map((address) => ({
        address,
        assets: assetsBySiteId.get(address.id) ?? [],
      }));
      const sitesWithAssets = siteEntries.filter((entry) => entry.assets.length > 0);
      const totalAssets = siteEntries.reduce(
        (accumulator, entry) => accumulator + entry.assets.length,
        0
      );
      const activeAssets = siteEntries.reduce(
        (accumulator, entry) =>
          accumulator + entry.assets.filter((asset) => asset.is_active).length,
        0
      );

      summary.set(row.client.id, {
        totalAssets,
        activeAssets,
        inactiveAssets: totalAssets - activeAssets,
        sitesWithAssets: sitesWithAssets.length,
        focusAddress: sitesWithAssets[0]?.address ?? addressRows[0] ?? null,
      });
    });
    return summary;
  }, [assetsBySiteId, clientRows]);

  const commonOrganizationMetaByClientId = useMemo(() => {
    const countsByCommonName = new Map<string, number>();
    clientRows.forEach((row) => {
      const commonNameKey = getNormalizedSocialCommunityName(
        row.client,
        row.organization,
        socialCommunityGroupById
      );
      if (!commonNameKey) {
        return;
      }
      countsByCommonName.set(
        commonNameKey,
        (countsByCommonName.get(commonNameKey) ?? 0) + 1
      );
    });

    const summary: CommonOrganizationSummary = {
      totalDefinedClients: 0,
      groupedOrganizations: 0,
      pendingClients: 0,
    };
    countsByCommonName.forEach((count) => {
      summary.totalDefinedClients += count;
      if (count >= 2) {
        summary.groupedOrganizations += 1;
      }
    });
    summary.pendingClients = clientRows.length - summary.totalDefinedClients;

    const metadataByClientId = new Map<
      number,
      { commonName: string | null; groupSize: number; isGrouped: boolean }
    >();
    clientRows.forEach((row) => {
      const commonName = getClientSocialCommunityName(
        row.client,
        row.organization,
        socialCommunityGroupById,
        { fallbackToLegacyLegalName: false }
      );
      const commonNameKey = getNormalizedSocialCommunityName(
        row.client,
        row.organization,
        socialCommunityGroupById
      );
      const groupSize = commonNameKey ? countsByCommonName.get(commonNameKey) ?? 0 : 0;
      metadataByClientId.set(row.client.id, {
        commonName,
        groupSize,
        isGrouped: groupSize >= 2,
      });
    });

    return {
      metadataByClientId,
      summary,
    };
  }, [clientRows, socialCommunityGroupById]);

  const socialCommunityFilterOptions = useMemo(
    () =>
      socialCommunityGroups
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((group) => {
          const linkedClients = clientRows.filter(
            (row) => row.client.social_community_group_id === group.id
          ).length;
          return {
            value: `group:${group.id}`,
            label: linkedClients ? `${group.name} · ${linkedClients}` : group.name,
          };
        }),
    [clientRows, socialCommunityGroups]
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clientRows.filter((row) => {
      const metadata =
        commonOrganizationMetaByClientId.metadataByClientId.get(row.client.id) ?? null;
      const passesGroupFilter =
        groupFilter === "all"
          ? true
          : groupFilter === "defined"
            ? Boolean(row.client.social_community_group_id)
            : groupFilter === "pending"
              ? !row.client.social_community_group_id
              : groupFilter === "grouped"
                ? Boolean(metadata?.isGrouped)
                : groupFilter.startsWith("group:")
                  ? row.client.social_community_group_id === Number(groupFilter.slice(6))
                  : true;
      if (!passesGroupFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      const primaryContact = row.contacts.find((contact) => contact.is_primary) ?? row.contacts[0];
      const primaryAddress = row.addresses[0];
      const socialCommunityName = getClientSocialCommunityName(
        row.client,
        row.organization,
        socialCommunityGroupById,
        { fallbackToLegacyLegalName: false }
      );
      const haystack = [
        row.organization?.name,
        row.organization?.legal_name,
        socialCommunityName,
        row.organization?.tax_id,
        stripLegacyVisibleText(row.client.commercial_notes),
        primaryContact?.full_name,
        primaryContact?.email,
        primaryContact?.phone,
        primaryAddress?.name,
        primaryAddress?.address_line,
        primaryAddress?.commune,
        primaryAddress?.city,
        primaryAddress?.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [
    clientRows,
    commonOrganizationMetaByClientId.metadataByClientId,
    groupFilter,
    search,
    socialCommunityGroupById,
  ]);

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [
        clientsResponse,
        organizationsResponse,
        socialCommunityGroupsResponse,
        contactsResponse,
        addressesResponse,
        assetsResponse,
      ] =
        await Promise.all([
          getTenantBusinessClients(session.accessToken),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantSocialCommunityGroups(session.accessToken, { includeInactive: true }),
          getTenantBusinessContacts(session.accessToken),
          getTenantBusinessSites(session.accessToken),
          getTenantBusinessAssets(session.accessToken, { includeInactive: true }),
        ]);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSocialCommunityGroups(socialCommunityGroupsResponse.data);
      setContacts(contactsResponse.data);
      setAddresses(addressesResponse.data);
      setAssets(assetsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  function openCreateModal() {
    setModalError(null);
    setDuplicateCandidate(null);
    setFeedback(null);
    setModalState({
      mode: "create",
      clientId: null,
      organizationId: null,
      primaryContactId: null,
      secondaryContactId: null,
      primaryAddressId: null,
    });
    setModalForm(buildDefaultModalForm());
  }

  function openEditModal(row: ClientRow) {
    const primaryContact = row.contacts.find((contact) => contact.is_primary) ?? row.contacts[0] ?? null;
    const secondaryContact =
      row.contacts.find((contact) => !contact.is_primary && contact.id !== primaryContact?.id) ?? null;
    const primaryAddress = row.addresses[0] ?? null;
    setModalError(null);
    setDuplicateCandidate(null);
    setFeedback(null);
    setModalState({
      mode: "edit",
      clientId: row.client.id,
      organizationId: row.organization?.id ?? null,
      primaryContactId: primaryContact?.id ?? null,
      secondaryContactId: secondaryContact?.id ?? null,
      primaryAddressId: primaryAddress?.id ?? null,
    });
    const parsedAddress = parseAddressLine(primaryAddress?.address_line);
    setModalForm({
      organizationName: row.organization?.name ?? "",
      legalName: row.organization?.legal_name ?? "",
      socialCommunityGroupId: row.client.social_community_group_id ? String(row.client.social_community_group_id) : "",
      taxId: row.organization?.tax_id ?? "",
      phone: row.organization?.phone ?? "",
      email: row.organization?.email ?? "",
      serviceStatus: row.client.service_status,
      commercialNotes: stripLegacyVisibleText(row.client.commercial_notes) ?? "",
      primaryContactName: primaryContact?.full_name ?? "",
      primaryContactRole: primaryContact?.role_title ?? "",
      primaryContactPhone: primaryContact?.phone ?? "",
      primaryContactEmail: primaryContact?.email ?? "",
      secondaryContactName: secondaryContact?.full_name ?? "",
      secondaryContactRole: secondaryContact?.role_title ?? "",
      secondaryContactPhone: secondaryContact?.phone ?? "",
      secondaryContactEmail: secondaryContact?.email ?? "",
      addressLine: primaryAddress?.address_line ?? "",
      addressStreet: parsedAddress.street,
      addressNumber: parsedAddress.streetNumber,
      commune: primaryAddress?.commune ?? "",
      city: primaryAddress?.city ?? "",
      region: primaryAddress?.region ?? "",
      countryCode: primaryAddress?.country_code ?? "CL",
      referenceNotes: primaryAddress?.reference_notes ?? "",
    });
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }
    setModalState(null);
    setModalError(null);
    setDuplicateCandidate(null);
    setModalForm(buildDefaultModalForm());
  }

  function findDuplicateCandidate(form: ClientModalForm): DuplicateClientCandidate | null {
    const taxIdKey = normalizeTaxIdKey(form.taxId);
    const organizationNameKey = normalizeHumanKey(form.organizationName);
    const legalNameKey = normalizeHumanKey(form.legalName);
    const phoneKeys = [
      normalizePhoneKey(form.phone),
      normalizePhoneKey(form.primaryContactPhone),
      normalizePhoneKey(form.secondaryContactPhone),
    ].filter(Boolean);
    const emailKeys = [
      normalizeEmailKey(form.email),
      normalizeEmailKey(form.primaryContactEmail),
      normalizeEmailKey(form.secondaryContactEmail),
    ].filter(Boolean);
    const addressLine = buildAddressLine(form.addressStreet, form.addressNumber);
    const addressKey = normalizeHumanKey(
      [addressLine, form.commune, form.city, form.region].filter(Boolean).join(" | ")
    );

    let bestMatch: DuplicateClientCandidate | null = null;
    let bestScore = 0;

    clientRows.forEach((row) => {
      const reasons: string[] = [];
      let score = 0;
      const organization = row.organization;
      const existingAddressKeys = row.addresses.map((address) =>
        normalizeHumanKey(
          [
            address.address_line || address.name,
            address.commune,
            address.city,
            address.region,
          ]
            .filter(Boolean)
            .join(" | ")
        )
      );
      const existingPhoneKeys = [
        normalizePhoneKey(organization?.phone),
        ...row.contacts.map((contact) => normalizePhoneKey(contact.phone)),
      ].filter(Boolean);
      const existingEmailKeys = [
        normalizeEmailKey(organization?.email),
        ...row.contacts.map((contact) => normalizeEmailKey(contact.email)),
      ].filter(Boolean);

      if (taxIdKey && normalizeTaxIdKey(organization?.tax_id) === taxIdKey) {
        reasons.push(t("coincide el RUT / Tax ID", "the Tax ID matches"));
        score += 100;
      }
      if (
        organizationNameKey &&
        [
          normalizeHumanKey(organization?.name),
          normalizeHumanKey(organization?.legal_name),
        ].includes(organizationNameKey)
      ) {
        reasons.push(t("coincide el nombre del cliente", "the client name matches"));
        score += 70;
      }
      if (
        legalNameKey &&
        [
          normalizeHumanKey(organization?.name),
          normalizeHumanKey(organization?.legal_name),
        ].includes(legalNameKey)
      ) {
        reasons.push(t("coincide la razón social", "the legal name matches"));
        score += 70;
      }
      if (addressKey && existingAddressKeys.includes(addressKey)) {
        reasons.push(t("coincide la dirección principal", "the main address matches"));
        score += 80;
      }
      if (phoneKeys.some((phone) => existingPhoneKeys.includes(phone))) {
        reasons.push(t("coincide un teléfono existente", "an existing phone matches"));
        score += 75;
      }
      if (emailKeys.some((email) => existingEmailKeys.includes(email))) {
        reasons.push(t("coincide un email existente", "an existing email matches"));
        score += 75;
      }

      if (score > bestScore && reasons.length > 0) {
        bestScore = score;
        bestMatch = { row, reasons };
      }
    });

    return bestMatch;
  }

  async function handleSaveClient() {
    if (!session?.accessToken || !modalState) {
      return;
    }
    if (modalState.mode === "create") {
      const candidate = findDuplicateCandidate(modalForm);
      if (candidate) {
        setDuplicateCandidate(candidate);
        setModalError(
          t(
            "Ya existe un cliente muy parecido. Antes de crear otro, abre la ficha existente y agrega a la pareja o familiar como contacto si corresponde.",
            "A very similar client already exists. Before creating another one, open the existing detail and add the spouse or family member as a contact if appropriate."
          )
        );
        return;
      }
    }
    setIsSubmitting(true);
    setModalError(null);
    setDuplicateCandidate(null);
    try {
      const organizationPayload: TenantBusinessOrganizationWriteRequest = {
        name: modalForm.organizationName.trim(),
        legal_name: normalizeNullable(modalForm.legalName),
        tax_id: normalizeNullable(modalForm.taxId),
        organization_kind: "client",
        phone: normalizeNullable(modalForm.phone),
        email: normalizeNullable(modalForm.email),
        address_line: normalizeNullable(modalForm.addressLine),
        commune: normalizeNullable(modalForm.commune),
        city: normalizeNullable(modalForm.city),
        region: normalizeNullable(modalForm.region),
        country_code: normalizeNullable(modalForm.countryCode) ?? "CL",
        notes: null,
        is_active: true,
        sort_order: 100,
      };

      const organizationResponse =
        modalState.mode === "edit" && modalState.organizationId
          ? await updateTenantBusinessOrganization(
              session.accessToken,
              modalState.organizationId,
              organizationPayload
            )
          : await createTenantBusinessOrganization(
              session.accessToken,
              organizationPayload
            );
      const organization = organizationResponse.data;

      const clientPayload: TenantBusinessClientWriteRequest = {
        organization_id: organization.id,
        social_community_group_id: modalForm.socialCommunityGroupId
          ? Number(modalForm.socialCommunityGroupId)
          : null,
        client_code: null,
        service_status: modalForm.serviceStatus,
        commercial_notes: normalizeNullable(modalForm.commercialNotes),
        is_active: true,
        sort_order: 100,
      };

      const clientResponse =
        modalState.mode === "edit" && modalState.clientId
          ? await updateTenantBusinessClient(
              session.accessToken,
              modalState.clientId,
              clientPayload
            )
          : await createTenantBusinessClient(session.accessToken, clientPayload);
      const client = clientResponse.data;

      if (modalForm.primaryContactName.trim()) {
        const contactPayload: TenantBusinessContactWriteRequest = {
          organization_id: organization.id,
          full_name: modalForm.primaryContactName.trim(),
          email: normalizeNullable(modalForm.primaryContactEmail),
          phone: normalizeNullable(modalForm.primaryContactPhone),
          role_title: normalizeNullable(modalForm.primaryContactRole),
          is_primary: true,
          is_active: true,
          sort_order: 100,
        };
        if (modalState.mode === "edit" && modalState.primaryContactId) {
          await updateTenantBusinessContact(
            session.accessToken,
            modalState.primaryContactId,
            contactPayload
          );
        } else {
          await createTenantBusinessContact(session.accessToken, contactPayload);
        }
      }

      if (modalForm.secondaryContactName.trim()) {
        const secondaryContactPayload: TenantBusinessContactWriteRequest = {
          organization_id: organization.id,
          full_name: modalForm.secondaryContactName.trim(),
          email: normalizeNullable(modalForm.secondaryContactEmail),
          phone: normalizeNullable(modalForm.secondaryContactPhone),
          role_title: normalizeNullable(modalForm.secondaryContactRole),
          is_primary: false,
          is_active: true,
          sort_order: 200,
        };
        if (modalState.mode === "edit" && modalState.secondaryContactId) {
          await updateTenantBusinessContact(
            session.accessToken,
            modalState.secondaryContactId,
            secondaryContactPayload
          );
        } else {
          await createTenantBusinessContact(session.accessToken, secondaryContactPayload);
        }
      }

      const composedAddressLine = buildAddressLine(
        modalForm.addressStreet,
        modalForm.addressNumber
      );
      if (
        composedAddressLine ||
        modalForm.commune.trim() ||
        modalForm.city.trim() ||
        modalForm.region.trim()
      ) {
        const addressPayload: TenantBusinessSiteWriteRequest = {
          client_id: client.id,
          name: composedAddressLine || t("Dirección principal", "Primary address"),
          site_code: null,
          address_line: normalizeNullable(composedAddressLine),
          commune: normalizeNullable(modalForm.commune),
          city: normalizeNullable(modalForm.city),
          region: normalizeNullable(modalForm.region),
          country_code: "CL",
          reference_notes: normalizeNullable(modalForm.referenceNotes),
          is_active: true,
          sort_order: 100,
        };
        if (modalState.mode === "edit" && modalState.primaryAddressId) {
          await updateTenantBusinessSite(
            session.accessToken,
            modalState.primaryAddressId,
            addressPayload
          );
        } else {
          await createTenantBusinessSite(session.accessToken, addressPayload);
        }
      }

      setFeedback(
        modalState.mode === "edit"
          ? t("Cliente actualizado correctamente", "Client updated successfully")
          : t("Cliente creado correctamente", "Client created successfully")
      );
      closeModal();
      await loadData();
    } catch (rawError) {
      setModalError(getApiErrorDisplayMessage(rawError as ApiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(row: ClientRow) {
    if (!session?.accessToken) {
      return;
    }
    try {
      const response = await updateTenantBusinessClientStatus(
        session.accessToken,
        row.client.id,
        !row.client.is_active
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(row: ClientRow) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      t(
        `Eliminar "${row.organization?.name ?? "cliente"}" solo funcionará si no tiene direcciones ni mantenciones asociadas. Si ya tiene historial, debe desactivarse.`,
        `Deleting "${row.organization?.name ?? "client"}" only works if it has no linked addresses or maintenance history. If it already has history, it must be deactivated.`
      )
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessClient(session.accessToken, row.client.id);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  function buildAssetsHref(address: TenantBusinessSite | null): string | null {
    if (!address) {
      return null;
    }
    const params = new URLSearchParams({
      siteId: String(address.id),
      source: "business-core",
    });
    if (address.address_line) {
      params.set("q", address.address_line);
    }
    return `/tenant-portal/business-core/assets?${params.toString()}`;
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={t("Core de negocio", "Business core")}
        icon="business-core"
        title={t("Clientes", "Clients")}
        description={
          t(
            "Vista principal de lectura comercial. Aquí debes poder ubicar un cliente por nombre, contacto o dirección.",
            "Primary commercial reading view. You should be able to find a client by name, contact, or address here."
          )
        }
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={t("Ayuda", "Help")}
              helpText={
                t(
                  "La tabla de clientes debe ser tu lectura principal. Contactos y direcciones se consultan desde aquí y la ficha del cliente, no como catálogos separados.",
                  "The clients table should be your main reading view. Contacts and addresses are consulted from here and from the client detail, not as separate catalogs."
                )
              }
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => void loadData()}
            >
              {t("Recargar", "Reload")}
            </button>
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => navigate("/tenant-portal/business-core/social-community-groups")}
            >
              {t("Grupos sociales", "Social groups")}
            </button>
            <button
              className="btn btn-outline-dark"
              type="button"
              onClick={() => navigate("/tenant-portal/business-core/common-organization-name")}
            >
              {t("Sugerencias", "Suggestions")}
            </button>
            <button className="btn btn-primary" type="button" onClick={openCreateModal}>
              {t("Nuevo cliente", "New client")}
            </button>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={t("No se pudo cargar la vista de clientes", "The clients view could not be loaded")}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={t("Cargando clientes...", "Loading clients...")} />
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-md-4">
          <PanelCard
            title={t("Grupo social definido", "Defined social group")}
            subtitle={t(
              "Clientes que ya quedaron vinculados a un grupo social común.",
              "Clients already linked to a shared social group."
            )}
          >
            <div className="business-core-summary-metric">
              {commonOrganizationMetaByClientId.summary.totalDefinedClients}
            </div>
          </PanelCard>
        </div>
        <div className="col-12 col-md-4">
          <PanelCard
            title={t("Grupos sociales visibles", "Visible social groups")}
            subtitle={t(
              "Grupos sociales que hoy agrupan a 2 o más clientes.",
              "Social groups that currently group 2 or more clients."
            )}
          >
            <div className="business-core-summary-metric">
              {commonOrganizationMetaByClientId.summary.groupedOrganizations}
            </div>
          </PanelCard>
        </div>
        <div className="col-12 col-md-4">
          <PanelCard
            title={t("Pendientes por asignar", "Pending assignment")}
            subtitle={t(
              "Clientes que todavía no tienen grupo social común definido.",
              "Clients that still do not have a shared social group defined."
            )}
          >
            <div className="business-core-summary-metric">
              {commonOrganizationMetaByClientId.summary.pendingClients}
            </div>
          </PanelCard>
        </div>
      </div>

      <DataTableCard
        title={t("Clientes activos y cartera", "Client portfolio")}
        subtitle={
          t(
            "Busca por nombre, RUT, contacto, organización o dirección.",
            "Search by name, tax ID, contact, organization, or address."
          )
        }
        rows={filteredRows}
        actions={
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <select
              className="form-select"
              style={{ minWidth: "18rem" }}
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
            >
              <option value="all">{t("Todos los grupos sociales", "All social groups")}</option>
              <option value="defined">{t("Con grupo definido", "With defined group")}</option>
              <option value="grouped">{t("Con grupo visible (2+)", "With visible group (2+)")}</option>
              <option value="pending">{t("Pendientes por asignar", "Pending assignment")}</option>
              {socialCommunityFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              className="form-control business-core-search"
              type="search"
              placeholder={
                t(
                  "Buscar por cliente, RUT, contacto, organización o dirección",
                  "Search by client, tax ID, contact, organization, or address"
                )
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        }
        columns={[
          {
            key: "client",
            header: t("Cliente", "Client"),
            render: (row) => (
              <div>
                <div className="business-core-cell__title">
                  {row.organization?.name ?? t("Sin nombre", "No name")}
                </div>
                <div className="business-core-cell__meta">
                  {row.organization?.tax_id || "—"}
                </div>
              </div>
            ),
          },
          {
            key: "commonOrganization",
            header: t("Grupo social común", "Shared social group"),
            render: (row) => {
              const metadata =
                commonOrganizationMetaByClientId.metadataByClientId.get(row.client.id) ?? null;
              const commonName = metadata?.commonName ?? null;
              const group = row.client.social_community_group_id
                ? socialCommunityGroupById.get(row.client.social_community_group_id) ?? null
                : null;
              return (
                <div>
                  <div className="business-core-cell__title">
                    {commonName || t("sin definir", "not defined")}
                  </div>
                  <div className="business-core-cell__meta">
                    {commonName
                      ? metadata?.isGrouped
                        ? t(
                            `${metadata.groupSize} clientes bajo este grupo social`,
                            `${metadata.groupSize} clients under this social group`
                          )
                        : t(
                            "solo este cliente usa hoy este grupo social",
                            "only this client currently uses this social group"
                          )
                      : t(
                          "usa Grupos sociales para asignarlo directamente, o Sugerencias si necesitas limpiar clientes legacy por similitud",
                          "use Social groups to assign it directly, or Suggestions if you need to clean legacy clients by similarity"
                        )}
                  </div>
                  {commonName && row.organization?.name && commonName !== row.organization.name ? (
                    <div className="business-core-cell__meta">
                      {t("cliente base:", "base client:")} {row.organization.name}
                    </div>
                  ) : null}
                  {group?.commune || group?.territorial_classification ? (
                    <div className="business-core-cell__meta">
                      {[group?.commune, group?.territorial_classification]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </div>
              );
            },
          },
          {
            key: "contact",
            header: t("Contacto principal", "Primary contact"),
            render: (row) => {
              const primaryContact =
                row.contacts.find((contact) => contact.is_primary) ?? row.contacts[0];
              const secondaryContacts = row.contacts.filter(
                (contact) => !contact.is_primary && contact.id !== primaryContact?.id
              );
              const secondaryLabel =
                secondaryContacts.length === 1
                  ? t(`+1 respaldo`, `+1 backup`)
                  : secondaryContacts.length > 1
                    ? t(`+${secondaryContacts.length} respaldos`, `+${secondaryContacts.length} backups`)
                    : null;
              return (
                <div>
                  <div className="business-core-cell__title">
                    {primaryContact?.full_name || "—"}
                  </div>
                  <div className="business-core-cell__meta">
                    {primaryContact
                      ? [primaryContact.phone, primaryContact.email].filter(Boolean).join(" · ") || "—"
                      : "—"}
                  </div>
                  {secondaryLabel ? (
                    <div className="business-core-cell__meta">{secondaryLabel}</div>
                  ) : null}
                </div>
              );
            },
          },
          {
            key: "address",
            header: t("Dirección principal", "Primary address"),
            render: (row) => {
              const primaryAddress = row.addresses[0];
              const mapsUrl = primaryAddress ? buildGoogleMapsUrl(primaryAddress) : null;
              return (
                <div>
                  <div className="business-core-cell__title">
                    {primaryAddress?.address_line || "—"}
                  </div>
                  <div className="business-core-cell__meta">
                    {[primaryAddress?.commune, primaryAddress?.city, primaryAddress?.region]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                  {mapsUrl ? (
                    <div className="business-core-cell__meta">
                      <a href={mapsUrl} target="_blank" rel="noreferrer">
                        Google Maps
                      </a>
                    </div>
                  ) : null}
                </div>
              );
            },
          },
          {
            key: "status",
            header: t("Estado", "Status"),
            render: (row) => (
              <AppBadge tone={row.client.is_active ? "success" : "warning"}>
                {row.client.is_active ? t("activo", "active") : t("inactivo", "inactive")}
              </AppBadge>
            ),
          },
          {
            key: "assets",
            header: t("Activos", "Assets"),
            render: (row) => {
              const assetSummary = assetSummaryByClientId.get(row.client.id);
              const assetsHref = buildAssetsHref(assetSummary?.focusAddress ?? null);
              return (
                <div>
                  <div className="business-core-cell__title">
                    {assetSummary?.totalAssets
                      ? t(
                          `${assetSummary.totalAssets} visibles`,
                          `${assetSummary.totalAssets} visible`
                        )
                      : t("sin activos", "no assets")}
                  </div>
                  <div className="business-core-cell__meta">
                    {assetSummary?.totalAssets
                      ? t(
                          `activos ${assetSummary.activeAssets} · inactivos ${assetSummary.inactiveAssets}`,
                          `active ${assetSummary.activeAssets} · inactive ${assetSummary.inactiveAssets}`
                        )
                      : t(
                          "este cliente todavía no concentra inventario visible",
                          "this client does not have visible inventory yet"
                        )}
                  </div>
                  <div className="business-core-cell__meta">
                    {t(
                      `${assetSummary?.sitesWithAssets ?? 0} sitios con activos`,
                      `${assetSummary?.sitesWithAssets ?? 0} sites with assets`
                    )}
                  </div>
                  <div className="business-core-cell__meta">
                    {metadataLabelForGroup(
                      row,
                      commonOrganizationMetaByClientId.metadataByClientId,
                      t
                    )}
                  </div>
                  {assetsHref && assetSummary?.totalAssets ? (
                    <div className="business-core-cell__meta">
                      <a href={assetsHref}>{t("Activos sitio", "Site assets")}</a>
                    </div>
                  ) : null}
                </div>
              );
            },
          },
          {
            key: "actions",
            header: t("Acciones", "Actions"),
            render: (row) => (
              <AppToolbar compact>
                <button
                  className="btn btn-sm btn-outline-primary"
                  type="button"
                  onClick={() => navigate(`/tenant-portal/business-core/clients/${row.client.id}`)}
                >
                  {t("Ver ficha", "Open detail")}
                </button>
                <button
                  className="btn btn-sm btn-outline-dark"
                  type="button"
                  onClick={() => openEditModal(row)}
                >
                  {t("Editar", "Edit")}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => void handleToggle(row)}
                >
                  {row.client.is_active ? t("Desactivar", "Deactivate") : t("Activar", "Activate")}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  type="button"
                  onClick={() => void handleDelete(row)}
                >
                  {t("Eliminar", "Delete")}
                </button>
              </AppToolbar>
            ),
          },
        ]}
      />

      {modalState ? (
        <div className="confirm-dialog-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="confirm-dialog business-core-form-modal business-core-client-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("Cliente", "Client")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="business-core-form-modal__eyebrow">
              {t("Captura base", "Base capture")}
            </div>
            <div className="confirm-dialog__title">
              {modalState.mode === "edit"
                ? t("Editar cliente", "Edit client")
                : t("Nuevo cliente", "New client")}
            </div>
            <div className="confirm-dialog__description">
              {t(
                "Carga aquí los datos base del cliente. Los detalles adicionales de mantención vivirán luego sobre sus instalaciones.",
                "Load the client's base data here. Additional maintenance details will later live on top of its installations."
              )}
            </div>
            {modalError ? <div className="alert alert-danger mb-3">{modalError}</div> : null}
            {duplicateCandidate ? (
              <div className="alert alert-warning mb-3">
                <div className="fw-semibold mb-1">
                  {t(
                    `Cliente ya existente: ${duplicateCandidate.row.organization?.name ?? "cliente"}`,
                    `Existing client: ${duplicateCandidate.row.organization?.name ?? "client"}`
                  )}
                </div>
                <div className="mb-2">
                  {t(
                    `Se detectó coincidencia porque ${duplicateCandidate.reasons.join(", ")}.`,
                    `A match was detected because ${duplicateCandidate.reasons.join(", ")}.`
                  )}
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    className="btn btn-sm btn-primary"
                    type="button"
                    onClick={() => {
                      const clientId = duplicateCandidate.row.client.id;
                      closeModal();
                      navigate(`/tenant-portal/business-core/clients/${clientId}`);
                    }}
                  >
                    {t("Abrir ficha existente", "Open existing detail")}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={() => setDuplicateCandidate(null)}
                  >
                    {t("Seguir revisando", "Keep reviewing")}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="business-core-modal-grid business-core-modal-grid--client">
              <div className="business-core-modal-section business-core-modal-section--client-main">
                <div className="business-core-modal-section__title">
                  {t("Cliente", "Client")}
                </div>
                <div className="business-core-modal-section__hint">
                  {t(
                    "Solo identidad y datos comerciales del cliente. Los datos de contacto quedan abajo, en principal y secundario.",
                    "Only client identity and commercial data. Contact information stays below, in primary and secondary contact blocks."
                  )}
                </div>
                <div className="row g-3 business-core-form-grid--dense">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Nombre cliente", "Client name")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.organizationName}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          organizationName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Organización / Razón social", "Organization / legal name")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.legalName}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          legalName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Grupo social común", "Shared social group")}
                    </label>
                    <select
                      className="form-select"
                      value={modalForm.socialCommunityGroupId}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          socialCommunityGroupId: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {t("Sin grupo social asignado", "No social group assigned")}
                      </option>
                      {socialCommunityGroups
                        .filter(
                          (group) =>
                            group.is_active || String(group.id) === modalForm.socialCommunityGroupId
                        )
                        .sort((left, right) => left.name.localeCompare(right.name))
                        .map((group) => (
                          <option key={group.id} value={String(group.id)}>
                            {group.name}
                            {group.commune ? ` · ${group.commune}` : ""}
                            {!group.is_active ? ` · ${t("inactivo", "inactive")}` : ""}
                          </option>
                        ))}
                    </select>
                    <div className="business-core-cell__meta mt-1">
                      {t(
                        "Crea o corrige grupos sociales en el catálogo 'Grupos sociales'. Usa 'Sugerencias' solo para limpiar clientes legacy por similitud.",
                        "Create or edit social groups in the 'Social groups' catalog. Use 'Suggestions' only to clean up legacy clients by similarity."
                      )}
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">RUT / Tax ID</label>
                    <input
                      className="form-control"
                      value={modalForm.taxId}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          taxId: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Estado servicio", "Service status")}
                    </label>
                    <select
                      className="form-select"
                      value={modalForm.serviceStatus}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          serviceStatus: event.target.value,
                        }))
                      }
                    >
                      <option value="active">{t("Activo", "Active")}</option>
                      <option value="paused">{t("Pausado", "Paused")}</option>
                      <option value="prospect">{t("Prospecto", "Prospect")}</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      {t("Notas comerciales", "Commercial notes")}
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={modalForm.commercialNotes}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          commercialNotes: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="business-core-modal-section business-core-modal-section--client-side">
                <div className="business-core-modal-section__title">
                  {t("Contacto principal", "Primary contact")}
                </div>
                <div className="business-core-modal-section__hint">
                  {t(
                    "El contacto que debería aparecer primero en lectura diaria.",
                    "The contact that should appear first in day-to-day reading."
                  )}
                </div>
                <div className="row g-3 business-core-form-grid--dense">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Nombre completo", "Full name")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.primaryContactName}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          primaryContactName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Cargo", "Role")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.primaryContactRole}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          primaryContactRole: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Teléfono contacto", "Contact phone")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.primaryContactPhone}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          primaryContactPhone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Email contacto", "Contact email")}
                    </label>
                    <input
                      className="form-control"
                      type="email"
                      value={modalForm.primaryContactEmail}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          primaryContactEmail: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="business-core-modal-section business-core-modal-section--client-side">
                <div className="business-core-modal-section__title">
                  {t("Contacto secundario", "Secondary contact")}
                </div>
                <div className="business-core-modal-section__hint">
                  {t(
                    "Respaldo operativo si el contacto principal no responde. Los contactos extra siguen pudiendo gestionarse luego desde la ficha.",
                    "Operational backup if the primary contact does not respond. Extra contacts can still be managed later from the detail page."
                  )}
                </div>
                <div className="row g-3 business-core-form-grid--dense">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Nombre completo", "Full name")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.secondaryContactName}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          secondaryContactName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Cargo", "Role")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.secondaryContactRole}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          secondaryContactRole: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Teléfono contacto", "Contact phone")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.secondaryContactPhone}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          secondaryContactPhone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Email contacto", "Contact email")}
                    </label>
                    <input
                      className="form-control"
                      type="email"
                      value={modalForm.secondaryContactEmail}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          secondaryContactEmail: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="business-core-modal-section business-core-modal-section--client-side">
                <div className="business-core-modal-section__title">
                  {t("Dirección principal", "Primary address")}
                </div>
                <div className="business-core-modal-section__hint">
                  {t(
                    "Dirección operativa desde donde después colgarán instalaciones y mantenciones.",
                    "Operating address where installations and work orders will later hang from."
                  )}
                </div>
                <div className="row g-3 business-core-form-grid--dense">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Calle", "Street")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.addressStreet}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          addressStreet: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Número", "Number")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.addressNumber}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          addressNumber: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      {t("Comuna", "Commune")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.commune}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          commune: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      {t("Ciudad", "City")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.city}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      {t("Región", "Region")}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.region}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          region: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      {t("Notas de referencia", "Reference notes")}
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={modalForm.referenceNotes}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          referenceNotes: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="confirm-dialog__actions">
              <button
                className="btn btn-outline-primary"
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                {t("Cancelar", "Cancel")}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void handleSaveClient()}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t("Guardando...", "Saving...")
                  : modalState.mode === "edit"
                    ? t("Guardar cambios", "Save changes")
                    : t("Crear cliente", "Create client")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
