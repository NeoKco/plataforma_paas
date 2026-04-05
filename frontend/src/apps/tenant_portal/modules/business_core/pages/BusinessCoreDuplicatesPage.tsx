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
  updateTenantBusinessClientStatus,
} from "../services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../services/organizationsService";
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

type DuplicateEntityKind = "clients" | "sites" | "installations";

type ClientAuditRow = {
  client: TenantBusinessClient;
  organization: TenantBusinessOrganization | null;
  primarySite: TenantBusinessSite | null;
  sitesCount: number;
  installationsCount: number;
  workOrdersCount: number;
};

type SiteAuditRow = {
  site: TenantBusinessSite;
  client: TenantBusinessClient | null;
  organization: TenantBusinessOrganization | null;
  installationsCount: number;
  workOrdersCount: number;
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
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<TenantMaintenanceEquipmentType[]>([]);
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<DuplicateEntityKind | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const organizationById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  );
  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const siteById = useMemo(() => new Map(sites.map((item) => [item.id, item])), [sites]);
  const equipmentTypeById = useMemo(
    () => new Map(equipmentTypes.map((item) => [item.id, item])),
    [equipmentTypes]
  );
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
      const [clientsResponse, organizationsResponse, sitesResponse, installationsResponse, equipmentTypesResponse, workOrdersResponse] =
        await Promise.all([
          getTenantBusinessClients(session.accessToken, { includeInactive: true }),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantBusinessSites(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceInstallations(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceEquipmentTypes(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceWorkOrders(session.accessToken),
        ]);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setEquipmentTypes(equipmentTypesResponse.data);
      setWorkOrders(workOrdersResponse.data);
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
        sitesCount: clientSites.length,
        installationsCount,
        workOrdersCount: workOrdersByClientId.get(client.id)?.length ?? 0,
      };
    });
  }, [clients, installationsBySiteId, organizationById, sitesByClientId, workOrdersByClientId]);

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

  const clientGroups = useMemo(() => buildClientDuplicateGroups(clientRows), [clientRows]);
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

  const visibleClientGroups = useMemo(
    () => filterGroups(clientGroups, "clients"),
    [clientGroups, entityFilter, search]
  );
  const visibleSiteGroups = useMemo(
    () => filterGroups(siteGroups, "sites"),
    [siteGroups, entityFilter, search]
  );
  const visibleInstallationGroups = useMemo(
    () => filterGroups(installationGroups, "installations"),
    [installationGroups, entityFilter, search]
  );

  const totalVisibleGroups =
    visibleClientGroups.length + visibleSiteGroups.length + visibleInstallationGroups.length;
  const safeDeleteCandidates =
    visibleClientGroups.reduce(
      (total, group) =>
        total +
        group.members.filter(
          (member) => member.sitesCount === 0 && member.installationsCount === 0 && member.workOrdersCount === 0
        ).length,
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
    const confirmed = window.confirm(
      language === "es"
        ? `Consolidar ${sources.length} ficha(s) duplicada(s) en "${getClientName(target.organization, language)}". Se moverán ${totalSites} direcciones y ${totalWorkOrders} OT al cliente sugerido, y luego se desactivarán las fichas origen.`
        : `Consolidate ${sources.length} duplicate record(s) into "${getClientName(target.organization, language)}". ${totalSites} addresses and ${totalWorkOrders} work orders will be moved to the suggested client, and the source records will then be deactivated.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      for (const source of sources) {
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
      setFeedback(
        language === "es"
          ? `Consolidación aplicada sobre ${sources.length} ficha(s) duplicada(s).`
          : `Consolidation applied to ${sources.length} duplicate record(s).`
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
    const confirmed = window.confirm(
      language === "es"
        ? `Consolidar ${sources.length} dirección(es) duplicada(s) en "${getVisibleAddressLabel(target.site)}". Se moverán ${totalInstallations} instalaciones y ${totalWorkOrders} OT al sitio sugerido, y luego se desactivarán los sitios origen.`
        : `Consolidate ${sources.length} duplicate address(es) into "${getVisibleAddressLabel(target.site)}". ${totalInstallations} installations and ${totalWorkOrders} work orders will be moved to the suggested site, and the source sites will then be deactivated.`
    );
    if (!confirmed) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
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

  function renderClientGroup(group: DuplicateGroup<ClientAuditRow>) {
    const preferredClientId = getPreferredClientId(group);
    const sourceMembers = group.members.filter((member) => member.client.id !== preferredClientId);
    const mergeSitesCount = sourceMembers.reduce(
      (total, source) => total + sites.filter((site) => site.client_id === source.client.id).length,
      0
    );
    const mergeWorkOrdersCount = sourceMembers.reduce(
      (total, source) =>
        total + workOrders.filter((workOrder) => workOrder.client_id === source.client.id).length,
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
                {sourceMembers.length} {language === "es" ? "fichas origen" : "source records"}
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

  function renderSiteGroup(group: DuplicateGroup<SiteAuditRow>) {
    const preferredSiteId = getPreferredSiteId(group);
    const sourceMembers = group.members.filter((member) => member.site.id !== preferredSiteId);
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
            ? "Busca clientes, direcciones e instalaciones duplicadas y decide qué fichas pueden borrarse sin romper trazabilidad."
            : "Find duplicated clients, addresses, and installations and decide which records can be deleted without breaking traceability."
        }
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Este primer corte audita duplicados por coincidencias exactas normalizadas y muestra dependencias para evitar borrados que rompan mantenimiento o historial."
                  : "This first slice audits duplicates by normalized exact matches and shows dependencies to avoid deletions that would break maintenance or history."
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
                ? "Buscar por cliente, dirección, serie o instalación"
                : "Search by client, address, serial, or installation"
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
            <option value="clients">{language === "es" ? "Solo clientes" : "Clients only"}</option>
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
            <strong>{visibleClientGroups.length}</strong>
            <span>{language === "es" ? "grupos de clientes" : "client groups"}</span>
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
            ? "La interfaz marca una ficha sugerida para conservar por grupo. Si la duplicada ya tiene historial, conviene desactivarla o consolidarla hacia la sugerida; si está vacía, puedes borrarla."
            : "The interface marks one suggested record to keep per group. If the duplicate already has history, it is better to deactivate it or consolidate it into the suggested one; if it is empty, you can delete it."}
        </div>
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
