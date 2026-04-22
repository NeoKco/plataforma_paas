import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { pickLocalizedText, useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreHelpBubble } from "../components/common/BusinessCoreHelpBubble";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  getTenantBusinessClients,
  updateTenantBusinessClient,
  type TenantBusinessClient,
  type TenantBusinessClientWriteRequest,
} from "../services/clientsService";
import {
  getTenantBusinessContacts,
  type TenantBusinessContact,
} from "../services/contactsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../services/organizationsService";
import {
  createTenantSocialCommunityGroup,
  getTenantSocialCommunityGroups,
  updateTenantSocialCommunityGroup,
  type TenantSocialCommunityGroup,
  type TenantSocialCommunityGroupWriteRequest,
} from "../services/socialCommunityGroupsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../services/sitesService";
import {
  getClientSocialCommunityName,
} from "../utils/socialCommunityPresentation";

type ClientRow = {
  client: TenantBusinessClient;
  organization: TenantBusinessOrganization | null;
  contacts: TenantBusinessContact[];
  addresses: TenantBusinessSite[];
};

type SimilarityReason = "tax_id" | "exact_name" | "prefix_name" | "token_prefix";

type SimilarityCandidateRow = ClientRow & {
  candidateGroupId: string;
  candidateGroupName: string;
  candidateReasonCodes: SimilarityReason[];
  groupSize: number;
  currentCommonNames: string[];
};

type SocialCommunityGroupForm = {
  commune: string;
  sector: string;
  zone: string;
  territorialClassification: string;
  notes: string;
};

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function normalizeHumanKey(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
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

const ORGANIZATION_NAME_NOISE_TOKENS = new Set([
  "spa",
  "ltda",
  "limitada",
  "eirl",
  "sa",
  "saa",
  "sociedad",
  "empresa",
  "empresas",
  "comercial",
  "comercializadora",
  "servicio",
  "servicios",
  "inversiones",
  "holding",
]);

function getComparableOrganizationNames(
  organization: TenantBusinessOrganization | null
): string[] {
  if (!organization) {
    return [];
  }
  return Array.from(
    new Set(
      [organization.name, organization.legal_name]
        .map((value) => normalizeNullable(value))
        .filter((value): value is string => Boolean(value))
    )
  );
}

function getOrganizationNameTokens(organization: TenantBusinessOrganization | null): string[] {
  const baseName = getComparableOrganizationNames(organization)
    .map((value) => normalizeHumanKey(value))
    .find(Boolean);
  if (!baseName) {
    return [];
  }
  return baseName
    .split(" ")
    .filter(
      (token) => token.length > 1 && !ORGANIZATION_NAME_NOISE_TOKENS.has(token)
    );
}

function getFirstTokenPairKey(organization: TenantBusinessOrganization | null): string | null {
  const tokens = getOrganizationNameTokens(organization);
  if (tokens.length < 2) {
    return null;
  }
  return tokens.slice(0, 2).join(" ");
}

function matchSimilarityReasons(left: ClientRow, right: ClientRow): SimilarityReason[] {
  if (!left.organization || !right.organization) {
    return [];
  }

  const reasons = new Set<SimilarityReason>();
  const leftTaxId = normalizeTaxIdKey(left.organization.tax_id);
  const rightTaxId = normalizeTaxIdKey(right.organization.tax_id);
  if (leftTaxId && rightTaxId && leftTaxId === rightTaxId) {
    reasons.add("tax_id");
  }

  const leftNames = getComparableOrganizationNames(left.organization).map((value) =>
    normalizeHumanKey(value)
  );
  const rightNames = getComparableOrganizationNames(right.organization).map((value) =>
    normalizeHumanKey(value)
  );

  leftNames.forEach((leftName) => {
    rightNames.forEach((rightName) => {
      if (!leftName || !rightName) {
        return;
      }
      if (leftName === rightName) {
        reasons.add("exact_name");
        return;
      }
      const shorterName = leftName.length <= rightName.length ? leftName : rightName;
      const longerName = leftName.length > rightName.length ? leftName : rightName;
      if (shorterName.length >= 8 && longerName.startsWith(shorterName)) {
        reasons.add("prefix_name");
      }
    });
  });

  const leftTokenPair = getFirstTokenPairKey(left.organization);
  const rightTokenPair = getFirstTokenPairKey(right.organization);
  if (leftTokenPair && rightTokenPair && leftTokenPair === rightTokenPair) {
    reasons.add("token_prefix");
  }

  return Array.from(reasons);
}

function pickSuggestedCommonName(rows: ClientRow[]): string {
  const currentCommonNames = rows
    .map((row) => normalizeNullable(row.organization?.legal_name))
    .filter((value): value is string => Boolean(value));
  const candidates = (currentCommonNames.length > 0
    ? currentCommonNames
    : rows.flatMap((row) =>
        getComparableOrganizationNames(row.organization).map((value) => value.trim())
      )
  ).filter(Boolean);
  if (candidates.length === 0) {
    return "—";
  }
  return [...new Set(candidates)].sort(
    (left, right) => left.length - right.length || left.localeCompare(right)
  )[0];
}

function buildSimilarityCandidates(
  rows: ClientRow[],
  groupsById: Map<number, TenantSocialCommunityGroup>
): SimilarityCandidateRow[] {
  const eligibleRows = rows.filter((row) => row.organization);
  const adjacency = new Map<number, Set<number>>();
  const pairReasons = new Map<string, SimilarityReason[]>();

  function addEdge(leftId: number, rightId: number, reasons: SimilarityReason[]) {
    adjacency.set(leftId, new Set([...(adjacency.get(leftId) ?? []), rightId]));
    adjacency.set(rightId, new Set([...(adjacency.get(rightId) ?? []), leftId]));
    pairReasons.set(
      `${Math.min(leftId, rightId)}:${Math.max(leftId, rightId)}`,
      reasons
    );
  }

  for (let index = 0; index < eligibleRows.length; index += 1) {
    const current = eligibleRows[index];
    for (let peerIndex = index + 1; peerIndex < eligibleRows.length; peerIndex += 1) {
      const peer = eligibleRows[peerIndex];
      const reasons = matchSimilarityReasons(current, peer);
      if (reasons.length > 0) {
        addEdge(current.client.id, peer.client.id, reasons);
      }
    }
  }

  const rowByClientId = new Map(eligibleRows.map((row) => [row.client.id, row]));
  const visited = new Set<number>();
  const candidates: SimilarityCandidateRow[] = [];

  eligibleRows.forEach((row) => {
    if (visited.has(row.client.id) || !adjacency.has(row.client.id)) {
      return;
    }
    const stack = [row.client.id];
    const componentIds: number[] = [];
    while (stack.length > 0) {
      const currentId = stack.pop();
      if (currentId === undefined || visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);
      componentIds.push(currentId);
      (adjacency.get(currentId) ?? []).forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          stack.push(neighborId);
        }
      });
    }

    if (componentIds.length < 2) {
      return;
    }

    const componentRows = componentIds
      .map((clientId) => rowByClientId.get(clientId) ?? null)
      .filter((candidateRow): candidateRow is ClientRow => Boolean(candidateRow));

    const currentCommonNames = Array.from(
      new Set(
        componentRows
          .map((candidateRow) =>
            getClientSocialCommunityName(
              candidateRow.client,
              candidateRow.organization,
              groupsById,
              { fallbackToLegacyLegalName: false }
            )
          )
          .filter((value): value is string => Boolean(value))
      )
    );
    const socialGroupIds = Array.from(
      new Set(
        componentRows
          .map((candidateRow) => candidateRow.client.social_community_group_id)
          .filter((value): value is number => value !== null)
      )
    );
    if (
      socialGroupIds.length === 1 &&
      componentRows.every(
        (candidateRow) => candidateRow.client.social_community_group_id === socialGroupIds[0]
      )
    ) {
      return;
    }

    const groupReasons = new Set<SimilarityReason>();
    componentIds.forEach((leftId, leftIndex) => {
      componentIds.slice(leftIndex + 1).forEach((rightId) => {
        (
          pairReasons.get(`${Math.min(leftId, rightId)}:${Math.max(leftId, rightId)}`) ?? []
        ).forEach((reason) => groupReasons.add(reason));
      });
    });

    const suggestedCommonName = pickSuggestedCommonName(componentRows);
    componentRows.forEach((candidateRow) => {
      const rowReasonCodes = new Set<SimilarityReason>();
      componentIds.forEach((peerId) => {
        if (peerId === candidateRow.client.id) {
          return;
        }
        (
          pairReasons.get(
            `${Math.min(candidateRow.client.id, peerId)}:${Math.max(candidateRow.client.id, peerId)}`
          ) ?? []
        ).forEach((reason) => rowReasonCodes.add(reason));
      });
      if (rowReasonCodes.size === 0) {
        groupReasons.forEach((reason) => rowReasonCodes.add(reason));
      }
      candidates.push({
        ...candidateRow,
        candidateGroupId: `${suggestedCommonName}:${componentIds.join("-")}`,
        candidateGroupName: suggestedCommonName,
        candidateReasonCodes: Array.from(rowReasonCodes),
        groupSize: componentRows.length,
        currentCommonNames,
      });
    });
  });

  return candidates.sort((left, right) => {
    if (right.groupSize !== left.groupSize) {
      return right.groupSize - left.groupSize;
    }
    if (left.candidateGroupName !== right.candidateGroupName) {
      return left.candidateGroupName.localeCompare(right.candidateGroupName);
    }
    return (left.organization?.name ?? "").localeCompare(right.organization?.name ?? "");
  });
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

function buildSocialCommunityGroupPayload(
  name: string,
  form: SocialCommunityGroupForm,
  overrides: Partial<TenantSocialCommunityGroup> = {}
): TenantSocialCommunityGroupWriteRequest {
  return {
    name,
    commune: normalizeNullable(overrides.commune ?? form.commune),
    sector: normalizeNullable(overrides.sector ?? form.sector),
    zone: normalizeNullable(overrides.zone ?? form.zone),
    territorial_classification: normalizeNullable(
      overrides.territorial_classification ?? form.territorialClassification
    ),
    notes: normalizeNullable(overrides.notes ?? form.notes),
    is_active: overrides.is_active ?? true,
    sort_order: overrides.sort_order ?? 100,
  };
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

function getSimilarityReasonLabel(
  reason: SimilarityReason,
  t: (es: string, en: string) => string
): string {
  switch (reason) {
    case "tax_id":
      return t("Mismo RUT / Tax ID", "Same tax ID");
    case "exact_name":
      return t("Mismo nombre visible", "Same visible name");
    case "prefix_name":
      return t("Nombre muy parecido", "Very similar name");
    case "token_prefix":
      return t("Primeros términos iguales", "Same leading terms");
    default:
      return reason;
  }
}

export function BusinessCoreCommonOrganizationNamePage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const navigate = useNavigate();
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [socialCommunityGroups, setSocialCommunityGroups] = useState<TenantSocialCommunityGroup[]>([]);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [addresses, setAddresses] = useState<TenantBusinessSite[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [commonOrganizationName, setCommonOrganizationName] = useState("");
  const [socialGroupForm, setSocialGroupForm] = useState<SocialCommunityGroupForm>({
    commune: "",
    sector: "",
    zone: "",
    territorialClassification: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  const candidateRows = useMemo(
    () => buildSimilarityCandidates(clientRows, socialCommunityGroupById),
    [clientRows, socialCommunityGroupById]
  );

  const candidateRowByClientId = useMemo(
    () => new Map(candidateRows.map((row) => [row.client.id, row])),
    [candidateRows]
  );

  const candidateGroupCount = useMemo(
    () => new Set(candidateRows.map((row) => row.candidateGroupId)).size,
    [candidateRows]
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return candidateRows;
    }
    return candidateRows.filter((row) => {
      const primaryContact = row.contacts.find((contact) => contact.is_primary) ?? row.contacts[0];
      const primaryAddress = row.addresses[0];
      const haystack = [
        row.candidateGroupName,
        ...row.currentCommonNames,
        row.organization?.name,
        row.organization?.tax_id,
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
  }, [candidateRows, search]);

  const selectedRows = useMemo(
    () =>
      selectedClientIds
        .map((clientId) => candidateRowByClientId.get(clientId) ?? null)
        .filter((row): row is SimilarityCandidateRow => Boolean(row)),
    [candidateRowByClientId, selectedClientIds]
  );

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
        socialGroupsResponse,
        contactsResponse,
        addressesResponse,
      ] =
        await Promise.all([
          getTenantBusinessClients(session.accessToken),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantSocialCommunityGroups(session.accessToken, { includeInactive: true }),
          getTenantBusinessContacts(session.accessToken),
          getTenantBusinessSites(session.accessToken),
        ]);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSocialCommunityGroups(socialGroupsResponse.data);
      setContacts(contactsResponse.data);
      setAddresses(addressesResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  useEffect(() => {
    setSelectedClientIds((current) =>
      current.filter((clientId) => candidateRowByClientId.has(clientId))
    );
  }, [candidateRowByClientId]);

  function toggleClientSelection(clientId: number) {
    setSelectedClientIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId]
    );
  }

  function clearSelection() {
    setSelectedClientIds([]);
    setCommonOrganizationName("");
    setSocialGroupForm({
      commune: "",
      sector: "",
      zone: "",
      territorialClassification: "",
      notes: "",
    });
  }

  async function handleApplyCommonOrganizationName() {
    if (!session?.accessToken) {
      return;
    }
    if (selectedRows.length === 0) {
      setError(
        new Error(
          t(
            "Selecciona al menos un cliente candidato para aplicar nombre común.",
            "Select at least one candidate client to apply a common name."
          )
        ) as ApiError
      );
      return;
    }
    const finalOrganizationName = commonOrganizationName.trim();
    if (!finalOrganizationName) {
      setError(
        new Error(
          t(
            "Indica el nombre común final de la organización.",
            "Provide the final common organization name."
          )
        ) as ApiError
      );
      return;
    }

    const confirmed = window.confirm(
      t(
        `Asignar el grupo social "${finalOrganizationName}" a ${selectedRows.length} cliente(s) candidatos. Esto solo actualizará el vínculo con social_community_groups y los grupos ya resueltos dejarán de aparecer en esta vista.`,
        `Assign the social group "${finalOrganizationName}" to ${selectedRows.length} candidate client(s). This only updates the social_community_groups link and resolved groups will stop appearing in this view.`
      )
    );
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const normalizedName = normalizeHumanKey(finalOrganizationName);
      const existingGroup = socialCommunityGroups.find(
        (group) => normalizeHumanKey(group.name) === normalizedName
      );
      const groupPayload = buildSocialCommunityGroupPayload(
        finalOrganizationName,
        socialGroupForm,
        existingGroup ?? {}
      );
      const groupResponse = existingGroup
        ? await updateTenantSocialCommunityGroup(
            session.accessToken,
            existingGroup.id,
            groupPayload
          )
        : await createTenantSocialCommunityGroup(session.accessToken, groupPayload);
      const socialGroup = groupResponse.data;

      for (const row of selectedRows) {
        await updateTenantBusinessClient(
          session.accessToken,
          row.client.id,
          buildClientWritePayload(row.client, {
            social_community_group_id: socialGroup.id,
          })
        );
      }
      setFeedback(
        t(
          `Grupo social aplicado en ${selectedRows.length} cliente(s). Los grupos ya resueltos salen de esta vista.`,
          `Social group applied to ${selectedRows.length} client(s). Resolved groups now leave this view.`
        )
      );
      clearSelection();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={t("Core de negocio", "Business core")}
        icon="business-core"
        title={t(
          "Sugerencias de grupo social",
          "Social group suggestions"
        )}
        description={
          t(
            "Vista auxiliar para limpiar clientes legacy por similitud de empresa base. El flujo principal ahora vive en 'Grupos sociales' y en el selector directo del cliente.",
            "Auxiliary view to clean legacy clients by base-company similarity. The main flow now lives in 'Social groups' and in the direct selector inside each client."
          )
        }
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={t("Ayuda", "Help")}
              helpText={
                t(
                  "Aquí no se crean clientes ni empresas. Solo se revisan candidatos legacy por similitud de nombre. 'Grupo detectado' solo sirve para agrupar candidatos. El flujo normal es crear o mantener el catálogo en 'Grupos sociales' y luego seleccionarlo directamente en cada cliente.",
                  "This page does not create clients or companies. It only reviews legacy candidates by name similarity. 'Detected group' is only a grouping label. The normal flow is to maintain the catalog in 'Social groups' and then select it directly for each client."
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
              {t("Ir a grupos sociales", "Open social groups")}
            </button>
            <button
              className="btn btn-outline-dark"
              type="button"
              onClick={() => navigate("/tenant-portal/business-core/clients")}
            >
              {t("Volver a clientes", "Back to clients")}
            </button>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={t(
            "No se pudo cargar la normalización de organización",
            "The common organization normalization view could not be loaded"
          )}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={t("Cargando candidatos por similitud...", "Loading similarity candidates...")} />
      ) : null}

      <PanelCard
        title={t("Sugerencias por similitud", "Similarity suggestions")}
        subtitle={t(
          "Aquí solo aparecen candidatos legacy con empresas base de nombre parecido. Cuando ya exista el grupo correcto en el catálogo, puedes asignarlo desde aquí o directamente desde la ficha del cliente.",
          "Only legacy candidates with similar base-company names appear here. Once the correct group exists in the catalog, you can assign it here or directly from the client record."
        )}
      >
        <div className="business-core-manual-merge">
          <div className="business-core-manual-merge__summary">
            <span>
              {candidateGroupCount} {t("grupos detectados", "detected groups")}
            </span>
            <span>
              {selectedRows.length} {t("seleccionados", "selected")}
            </span>
            <span>
              {candidateRows.length} {t("clientes candidatos", "candidate clients")}
            </span>
          </div>
          <div className="business-core-manual-merge__grid">
            <label className="business-core-manual-merge__field">
              <span>{t("Nombre social común final", "Final social community name")}</span>
              <input
                className="form-control"
                value={commonOrganizationName}
                disabled={isSubmitting}
                placeholder={t("Ej.: Los Arbolitos", "Ex.: Los Arbolitos")}
                onChange={(event) => setCommonOrganizationName(event.target.value)}
              />
            </label>
            <label className="business-core-manual-merge__field">
              <span>{t("Comuna", "Commune")}</span>
              <input
                className="form-control"
                value={socialGroupForm.commune}
                disabled={isSubmitting}
                placeholder={t("Ej.: La Florida", "Ex.: La Florida")}
                onChange={(event) =>
                  setSocialGroupForm((current) => ({ ...current, commune: event.target.value }))
                }
              />
            </label>
            <label className="business-core-manual-merge__field">
              <span>{t("Sector", "Sector")}</span>
              <input
                className="form-control"
                value={socialGroupForm.sector}
                disabled={isSubmitting}
                placeholder={t("Ej.: Oriente", "Ex.: East")}
                onChange={(event) =>
                  setSocialGroupForm((current) => ({ ...current, sector: event.target.value }))
                }
              />
            </label>
            <label className="business-core-manual-merge__field">
              <span>{t("Zona", "Zone")}</span>
              <input
                className="form-control"
                value={socialGroupForm.zone}
                disabled={isSubmitting}
                placeholder={t("Ej.: Zona A", "Ex.: Zone A")}
                onChange={(event) =>
                  setSocialGroupForm((current) => ({ ...current, zone: event.target.value }))
                }
              />
            </label>
            <label className="business-core-manual-merge__field">
              <span>{t("Clasificación territorial / social", "Territorial / social classification")}</span>
              <input
                className="form-control"
                value={socialGroupForm.territorialClassification}
                disabled={isSubmitting}
                placeholder={t("Ej.: territorial", "Ex.: territorial")}
                onChange={(event) =>
                  setSocialGroupForm((current) => ({
                    ...current,
                    territorialClassification: event.target.value,
                  }))
                }
              />
            </label>
            <label className="business-core-manual-merge__field">
              <span>{t("Notas", "Notes")}</span>
              <input
                className="form-control"
                value={socialGroupForm.notes}
                disabled={isSubmitting}
                placeholder={t("Opcional", "Optional")}
                onChange={(event) =>
                  setSocialGroupForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="business-core-manual-merge__note">
            {t(
              "Si el grupo ya existe en el catálogo, se reutilizará. Si no existe, se creará con el nombre y los datos territoriales/sociales que escribas arriba. Luego los clientes seleccionados quedarán apuntando a ese grupo. No modifica empresa base, nombre cliente, contactos, direcciones ni mantenciones.",
              "If the group already exists in the catalog, it will be reused. Otherwise, it will be created with the name and territorial/social data you type above. Then the selected clients will point to that group. It does not modify the base company, client name, contacts, addresses, or maintenance records."
            )}
          </div>
          <div className="business-core-card__actions">
            <button
              className="btn btn-outline-secondary"
              type="button"
              disabled={selectedRows.length === 0 || isSubmitting}
              onClick={clearSelection}
            >
              {t("Limpiar selección", "Clear selection")}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={isSubmitting || selectedRows.length === 0 || !commonOrganizationName.trim()}
              onClick={() => void handleApplyCommonOrganizationName()}
            >
              {isSubmitting
                ? t("Aplicando...", "Applying...")
                : t("Asignar este grupo social", "Assign this social group")}
            </button>
          </div>
        </div>
      </PanelCard>

      <DataTableCard
        title={t(
          "Clientes legacy con sugerencia de grupo social",
          "Legacy clients with a social group suggestion"
        )}
        subtitle={t(
          "Busca por cliente, empresa base, contacto o dirección. 'Grupo detectado' solo agrupa candidatos legacy; el grupo social que se guardará es el del catálogo que escribas o reutilices arriba.",
          "Search by client, base company, contact, or address. 'Detected group' only groups legacy candidates; the social group that will be saved is the catalog record you type or reuse above."
        )}
        rows={filteredRows}
        actions={
          <input
            className="form-control business-core-search"
            type="search"
            placeholder={t(
              "Buscar por cliente, organización, contacto o dirección",
              "Search by client, organization, contact, or address"
            )}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
        columns={[
          {
            key: "select",
            header: t("Sel.", "Pick"),
            render: (row) => (
              <label className="business-core-selection-toggle">
                <input
                  type="checkbox"
                  checked={selectedClientIds.includes(row.client.id)}
                  disabled={isSubmitting}
                  onChange={() => toggleClientSelection(row.client.id)}
                />
                <span>{t("marcar", "pick")}</span>
              </label>
            ),
          },
          {
            key: "candidate",
            header: t("Grupo detectado", "Detected group"),
            render: (row) => (
              <div>
                <div className="business-core-cell__title">{row.candidateGroupName}</div>
                <div className="business-core-cell__meta">
                  {row.groupSize} {t("clientes en el grupo", "clients in group")}
                </div>
                {row.currentCommonNames.length > 0 ? (
                  <div className="business-core-cell__meta">
                    {t("Grupos sociales actuales:", "Current social groups:")} {row.currentCommonNames.join(" · ")}
                  </div>
                ) : (
                  <div className="business-core-cell__meta">
                    {t("Sin grupo social previo", "No previous social group")}
                  </div>
                )}
              </div>
            ),
          },
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
                {row.organization?.legal_name ? (
                  <div className="business-core-cell__meta">
                    {t("Empresa / Razón social actual:", "Current company / legal name:")} {row.organization.legal_name}
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: "reason",
            header: t("Señal", "Signal"),
            render: (row) => (
              <div>
                <div className="business-core-cell__title">
                  {row.candidateReasonCodes
                    .slice(0, 2)
                    .map((reason) => getSimilarityReasonLabel(reason, t))
                    .join(" · ") || "—"}
                </div>
                <div className="business-core-cell__meta">
                  {t(
                    "Revisión manual recomendada antes de homologar.",
                    "Manual review is recommended before aligning."
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "contact",
            header: t("Contacto principal", "Primary contact"),
            render: (row) => {
              const primaryContact =
                row.contacts.find((contact) => contact.is_primary) ?? row.contacts[0];
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
                  onClick={() => navigate("/tenant-portal/business-core/clients")}
                >
                  {t("Ir a clientes", "Open clients")}
                </button>
              </AppToolbar>
            ),
          },
        ]}
      />
    </div>
  );
}
