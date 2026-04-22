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
  type TenantBusinessClient,
} from "../services/clientsService";
import {
  getTenantBusinessContacts,
  type TenantBusinessContact,
} from "../services/contactsService";
import {
  getTenantBusinessOrganizations,
  updateTenantBusinessOrganization,
  type TenantBusinessOrganization,
  type TenantBusinessOrganizationWriteRequest,
} from "../services/organizationsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../services/sitesService";

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

function buildSimilarityCandidates(rows: ClientRow[]): SimilarityCandidateRow[] {
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
          .map((candidateRow) => normalizeNullable(candidateRow.organization?.legal_name))
          .filter((value): value is string => Boolean(value))
      )
    );
    if (
      currentCommonNames.length === 1 &&
      componentRows.every((candidateRow) =>
        normalizeHumanKey(candidateRow.organization?.legal_name) ===
        normalizeHumanKey(currentCommonNames[0])
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
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [addresses, setAddresses] = useState<TenantBusinessSite[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [commonOrganizationName, setCommonOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
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

  const candidateRows = useMemo(() => buildSimilarityCandidates(clientRows), [clientRows]);

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
      const [clientsResponse, organizationsResponse, contactsResponse, addressesResponse] =
        await Promise.all([
          getTenantBusinessClients(session.accessToken),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantBusinessContacts(session.accessToken),
          getTenantBusinessSites(session.accessToken),
        ]);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
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
        `Aplicar "${finalOrganizationName}" a ${selectedRows.length} cliente(s) candidatos. Esto solo actualizará "Organización / Razón social" y los grupos homologados dejarán de aparecer en esta vista.`,
        `Apply "${finalOrganizationName}" to ${selectedRows.length} candidate client(s). This only updates "Organization / legal name" and aligned groups will stop appearing in this view.`
      )
    );
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const processedOrganizationIds = new Set<number>();
      for (const row of selectedRows) {
        if (!row.organization || processedOrganizationIds.has(row.organization.id)) {
          continue;
        }
        processedOrganizationIds.add(row.organization.id);
        await updateTenantBusinessOrganization(
          session.accessToken,
          row.organization.id,
          buildOrganizationWritePayload(row.organization, {
            legal_name: finalOrganizationName,
          })
        );
      }
      setFeedback(
        t(
          `Nombre común aplicado en ${selectedRows.length} cliente(s). Los grupos ya homologados salen de esta vista.`,
          `Common name applied to ${selectedRows.length} client(s). Aligned groups now leave this view.`
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
          "Clientes candidatos a homologar organización",
          "Clients that may need organization alignment"
        )}
        description={
          t(
            "Aquí aparecen clientes con organizaciones de nombre parecido. Tú marcas los que sí correspondan y escribes manualmente el nombre común final que quieres guardar en 'Organización / Razón social'.",
            "This page shows clients whose organizations have similar names. You pick the ones that truly belong together and manually type the final common name to save into 'Organization / legal name'."
          )
        }
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={t("Ayuda", "Help")}
              helpText={
                t(
                  "Aquí no se buscan vacíos; se muestran candidatos por similitud de nombre. 'Grupo detectado' solo sirve para agrupar candidatos. El único valor que se guardará es el que tú escribas en 'Nombre común final'.",
                  "This page does not search for blanks; it shows candidates based on name similarity. 'Detected group' is only a grouping label. The only value that will be saved is the one you type into 'Final common name'."
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
        title={t("Candidatos por similitud", "Similarity candidates")}
        subtitle={t(
          "Solo se muestran grupos de clientes con organizaciones de nombre parecido. Tú eliges a cuáles aplicarles el nombre común que escribes arriba; cuando el grupo queda homologado con un mismo valor en 'Organización / Razón social', desaparece de esta vista.",
          "Only client groups with similar organization names are shown. You choose which ones receive the common name you type above; once the group is aligned under the same 'Organization / legal name', it disappears from this view."
        )}
      >
        <div className="business-core-manual-merge">
          <div className="business-core-manual-merge__summary">
            <span>
              {candidateGroupCount} {t("grupos sugeridos", "suggested groups")}
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
              <span>{t("Nombre común final", "Final common name")}</span>
              <input
                className="form-control"
                value={commonOrganizationName}
                disabled={isSubmitting}
                placeholder={t("Ej.: Los Arbolitos", "Ex.: Los Arbolitos")}
                onChange={(event) => setCommonOrganizationName(event.target.value)}
              />
            </label>
          </div>
          <div className="business-core-manual-merge__note">
            {t(
              "Se guardará exactamente el nombre que escribas arriba en 'Organización / Razón social' para los clientes seleccionados. No modifica nombre cliente, contactos, direcciones ni mantenciones.",
              "The exact name you type above will be saved into 'Organization / legal name' for the selected clients. It does not modify client name, contacts, addresses, or maintenance records."
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
                : t("Aplicar este nombre común", "Apply this common name")}
            </button>
          </div>
        </div>
      </PanelCard>

      <DataTableCard
        title={t(
          "Clientes candidatos a organización común",
          "Clients with a common organization candidate"
        )}
        subtitle={t(
          "Busca por cliente, organización actual, contacto o dirección. 'Grupo detectado' solo agrupa candidatos; el nombre que se guardará es el que escribas arriba.",
          "Search by client, current organization, contact, or address. 'Detected group' only groups candidates; the name that will be saved is the one you type above."
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
                    {t("Nombres comunes actuales:", "Current common names:")} {row.currentCommonNames.join(" · ")}
                  </div>
                ) : (
                  <div className="business-core-cell__meta">
                    {t("Sin nombre común previo", "No previous common name")}
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
                    {t("Organización / Razón social actual:", "Current organization / legal name:")} {row.organization.legal_name}
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
