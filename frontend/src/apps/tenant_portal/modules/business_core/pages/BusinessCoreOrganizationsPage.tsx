import { useEffect, useMemo, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../services/clientsService";
import {
  getTenantSocialCommunityGroups,
  type TenantSocialCommunityGroup,
} from "../services/socialCommunityGroupsService";
import {
  createTenantBusinessContact,
  getTenantBusinessContacts,
  updateTenantBusinessContact,
  type TenantBusinessContact,
  type TenantBusinessContactWriteRequest,
} from "../services/contactsService";
import {
  createTenantBusinessOrganization,
  deleteTenantBusinessOrganization,
  getTenantBusinessOrganizations,
  updateTenantBusinessOrganization,
  updateTenantBusinessOrganizationStatus,
  type TenantBusinessOrganization,
  type TenantBusinessOrganizationWriteRequest,
} from "../services/organizationsService";
import {
  buildAddressLine,
  parseAddressLine,
} from "../utils/addressPresentation";
import { getClientSocialCommunityName } from "../utils/socialCommunityPresentation";

type OrganizationForm = TenantBusinessOrganizationWriteRequest & {
  street: string;
  streetNumber: string;
  primary_contact_name: string;
  primary_contact_phone: string;
  primary_contact_email: string;
};

function buildDefaultForm(): OrganizationForm {
  return {
    name: "",
    legal_name: null,
    tax_id: null,
    organization_kind: "supplier",
    phone: null,
    email: null,
    address_line: null,
    street: "",
    streetNumber: "",
    commune: null,
    city: null,
    region: null,
    country_code: "CL",
    notes: null,
    is_active: true,
    sort_order: 100,
    primary_contact_name: "",
    primary_contact_phone: "",
    primary_contact_email: "",
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function buildGoogleMapsUrl(organization: TenantBusinessOrganization) {
  const query = [
    organization.address_line,
    organization.commune,
    organization.city,
    organization.region,
    organization.country_code || "Chile",
  ]
    .filter(Boolean)
    .join(", ");
  if (!query) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getAddressReadiness(
  organization: TenantBusinessOrganization
): "missing" | "partial" | "complete" {
  const hasAnyAddressField = Boolean(
    organization.address_line || organization.commune || organization.city || organization.region
  );
  if (!hasAnyAddressField) {
    return "missing";
  }
  if (
    organization.address_line &&
    organization.commune &&
    organization.city &&
    organization.region
  ) {
    return "complete";
  }
  return "partial";
}

export function BusinessCoreOrganizationsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [socialCommunityGroups, setSocialCommunityGroups] = useState<
    TenantSocialCommunityGroup[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<OrganizationForm>(buildDefaultForm());

  const contactsByOrganizationId = useMemo(() => {
    const grouped = new Map<number, TenantBusinessContact[]>();
    contacts.forEach((contact) => {
      const current = grouped.get(contact.organization_id) ?? [];
      current.push(contact);
      grouped.set(contact.organization_id, current);
    });
    return grouped;
  }, [contacts]);

  const clientCountByOrganizationId = useMemo(() => {
    const grouped = new Map<number, number>();
    clients.forEach((client) => {
      grouped.set(client.organization_id, (grouped.get(client.organization_id) ?? 0) + 1);
    });
    return grouped;
  }, [clients]);

  const socialCommunityGroupById = useMemo(
    () => new Map(socialCommunityGroups.map((group) => [group.id, group])),
    [socialCommunityGroups]
  );

  const socialCoverageByOrganizationId = useMemo(() => {
    const grouped = new Map<
      number,
      {
        linkedClients: number;
        definedClients: number;
        pendingClients: number;
        groupNames: string[];
      }
    >();
    organizations.forEach((organization) => {
      grouped.set(organization.id, {
        linkedClients: 0,
        definedClients: 0,
        pendingClients: 0,
        groupNames: [],
      });
    });
    clients.forEach((client) => {
      const current = grouped.get(client.organization_id) ?? {
        linkedClients: 0,
        definedClients: 0,
        pendingClients: 0,
        groupNames: [],
      };
      const organization = organizations.find((item) => item.id === client.organization_id) ?? null;
      const commonName = getClientSocialCommunityName(
        client,
        organization,
        socialCommunityGroupById,
        { fallbackToLegacyLegalName: false }
      );
      grouped.set(client.organization_id, {
        linkedClients: current.linkedClients + 1,
        definedClients: current.definedClients + (commonName ? 1 : 0),
        pendingClients: current.pendingClients + (commonName ? 0 : 1),
        groupNames: commonName
          ? Array.from(new Set([...current.groupNames, commonName])).sort()
          : current.groupNames,
      });
    });
    return grouped;
  }, [clients, organizations, socialCommunityGroupById]);

  async function loadOrganizations() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [
        organizationsResponse,
        contactsResponse,
        clientsResponse,
        socialCommunityGroupsResponse,
      ] = await Promise.all([
        getTenantBusinessOrganizations(session.accessToken, {
          excludeClientOrganizations: true,
        }),
        getTenantBusinessContacts(session.accessToken),
        getTenantBusinessClients(session.accessToken, { includeInactive: true }),
        getTenantSocialCommunityGroups(session.accessToken, { includeInactive: true }),
      ]);
      setOrganizations(organizationsResponse.data);
      setContacts(contactsResponse.data);
      setClients(clientsResponse.data);
      setSocialCommunityGroups(socialCommunityGroupsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, [session?.accessToken]);

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setForm(buildDefaultForm());
  }

  function startEdit(organization: TenantBusinessOrganization) {
    const parsedAddress = parseAddressLine(organization.address_line);
    const primaryContact =
      contactsByOrganizationId.get(organization.id)?.find((contact) => contact.is_primary) ??
      contactsByOrganizationId.get(organization.id)?.[0] ??
      null;
    setEditingId(organization.id);
    setFeedback(null);
    setError(null);
    setForm({
      name: organization.name,
      legal_name: organization.legal_name,
      tax_id: organization.tax_id,
      organization_kind: organization.organization_kind,
      phone: organization.phone,
      email: organization.email,
      address_line: organization.address_line,
      street: parsedAddress.street,
      streetNumber: parsedAddress.streetNumber,
      commune: organization.commune,
      city: organization.city,
      region: organization.region,
      country_code: organization.country_code,
      notes: stripLegacyVisibleText(organization.notes),
      is_active: organization.is_active,
      sort_order: organization.sort_order,
      primary_contact_name: primaryContact?.full_name ?? "",
      primary_contact_phone: primaryContact?.phone ?? "",
      primary_contact_email: primaryContact?.email ?? "",
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    const composedAddressLine = buildAddressLine(form.street, form.streetNumber);
    const payload: TenantBusinessOrganizationWriteRequest = {
      ...form,
      name: form.name.trim(),
      legal_name: normalizeNullable(form.legal_name),
      tax_id: normalizeNullable(form.tax_id),
      phone: normalizeNullable(form.phone),
      email: normalizeNullable(form.email),
      address_line: normalizeNullable(composedAddressLine),
      commune: normalizeNullable(form.commune),
      city: normalizeNullable(form.city),
      region: normalizeNullable(form.region),
      country_code: normalizeNullable(form.country_code) ?? "CL",
      notes: stripLegacyVisibleText(normalizeNullable(form.notes)),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessOrganization(session.accessToken, editingId, payload)
        : await createTenantBusinessOrganization(session.accessToken, payload);
      const organizationId = response.data.id;
      const currentPrimaryContact =
        contactsByOrganizationId.get(organizationId)?.find((contact) => contact.is_primary) ??
        contactsByOrganizationId.get(organizationId)?.[0] ??
        null;
      if (normalizeNullable(form.primary_contact_name)) {
        const contactPayload: TenantBusinessContactWriteRequest = {
          organization_id: organizationId,
          full_name: form.primary_contact_name.trim(),
          email: normalizeNullable(form.primary_contact_email),
          phone: normalizeNullable(form.primary_contact_phone),
          role_title: language === "es" ? "Contacto principal" : "Primary contact",
          is_primary: true,
          is_active: true,
          sort_order: 100,
        };
        if (currentPrimaryContact) {
          await updateTenantBusinessContact(
            session.accessToken,
            currentPrimaryContact.id,
            contactPayload
          );
        } else {
          await createTenantBusinessContact(session.accessToken, contactPayload);
        }
      }
      setFeedback(response.message);
      startCreate();
      await loadOrganizations();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(organization: TenantBusinessOrganization) {
    if (!session?.accessToken) {
      return;
    }
    try {
      const response = await updateTenantBusinessOrganizationStatus(
        session.accessToken,
        organization.id,
        !organization.is_active
      );
      setFeedback(response.message);
      await loadOrganizations();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(organization: TenantBusinessOrganization) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${organization.name}" solo funcionará si no tiene clientes ni contactos asociados. ¿Continuar?`
        : `Deleting "${organization.name}" only works if it has no linked clients or contacts. Continue?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessOrganization(session.accessToken, organization.id);
      if (editingId === organization.id) {
        startCreate();
      }
      setFeedback(response.message);
      await loadOrganizations();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Empresas y contrapartes operativas"
      titleEn="Operational organizations and counterparts"
      descriptionEs="Catálogo para empresa propia, proveedores y partners. Los clientes operativos se gestionan en la vista de Clientes."
      descriptionEn="Catalog for own company, suppliers, and partners. Operational clients are managed from the Clients view."
      helpEs="Esta vista excluye por defecto las organizaciones ya usadas como clientes. Usa Clientes para la cartera comercial y Empresas para contrapartes operativas."
      helpEn="This view excludes organizations already used as clients by default. Use Clients for the commercial portfolio and Organizations for operational counterparts."
      loadingLabelEs="Cargando organizaciones..."
      loadingLabelEn="Loading organizations..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={organizations}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadOrganizations}
      onNew={startCreate}
      renderTableIntro={({ language: currentLanguage, rows }) => {
        const organizationsWithAddress = rows.filter((organization) =>
          Boolean(organization.address_line)
        ).length;
        const organizationsWithCompleteAddress = rows.filter(
          (organization) => getAddressReadiness(organization) === "complete"
        ).length;
        const organizationsWithPrimaryContact = rows.filter((organization) => {
          const primaryContact =
            contactsByOrganizationId.get(organization.id)?.find((contact) => contact.is_primary) ??
            contactsByOrganizationId.get(organization.id)?.[0] ??
            null;
          return Boolean(primaryContact);
        }).length;
        const organizationsWithDefinedSocialGroups = rows.filter((organization) => {
          const coverage = socialCoverageByOrganizationId.get(organization.id);
          return Boolean(coverage?.groupNames.length);
        }).length;

        return (
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <div className="panel-card">
                <div className="panel-card__header">
                  <h2 className="panel-card__title">
                    {currentLanguage === "es"
                      ? "Dirección operativa cargada"
                      : "Operational address loaded"}
                  </h2>
                  <p className="panel-card__subtitle mb-0">
                    {currentLanguage === "es"
                      ? "Contrapartes con dirección propia visible para mapa y lectura diaria."
                      : "Counterparts with their own visible address for maps and daily reading."}
                  </p>
                </div>
                <div className="business-core-summary-metric">{organizationsWithAddress}</div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="panel-card">
                <div className="panel-card__header">
                  <h2 className="panel-card__title">
                    {currentLanguage === "es" ? "Dirección completa" : "Complete address"}
                  </h2>
                  <p className="panel-card__subtitle mb-0">
                    {currentLanguage === "es"
                      ? "Contrapartes con calle, comuna, ciudad y región listas para lectura operativa."
                      : "Counterparts with street, commune, city, and region ready for operational reading."}
                  </p>
                </div>
                <div className="business-core-summary-metric">
                  {organizationsWithCompleteAddress}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="panel-card">
                <div className="panel-card__header">
                  <h2 className="panel-card__title">
                    {currentLanguage === "es" ? "Contacto principal listo" : "Primary contact ready"}
                  </h2>
                  <p className="panel-card__subtitle mb-0">
                    {currentLanguage === "es"
                      ? "Contrapartes con lectura de contacto resoluble sin abrir otros catálogos."
                      : "Counterparts whose contact reading is available without opening other catalogs."}
                  </p>
                </div>
                <div className="business-core-summary-metric">
                  {organizationsWithPrimaryContact}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="panel-card">
                <div className="panel-card__header">
                  <h2 className="panel-card__title">
                    {currentLanguage === "es"
                      ? "Grupos sociales ligados"
                      : "Linked social groups"}
                  </h2>
                  <p className="panel-card__subtitle mb-0">
                    {currentLanguage === "es"
                      ? "Contrapartes de esta vista cuyos clientes ya quedaron agrupados socialmente."
                      : "Counterparts in this view whose clients already share a social grouping."}
                  </p>
                </div>
                <div className="business-core-summary-metric">
                  {organizationsWithDefinedSocialGroups}
                </div>
              </div>
            </div>
          </div>
        );
      }}
      fields={[
        { key: "name", labelEs: "Nombre", labelEn: "Name", placeholderEs: "Ej: Acme Ltda", placeholderEn: "Ex: Acme Ltd" },
        { key: "legal_name", labelEs: "Razón social", labelEn: "Legal name" },
        { key: "tax_id", labelEs: "RUT / Tax ID", labelEn: "Tax ID" },
        {
          key: "organization_kind",
          labelEs: "Tipo",
          labelEn: "Kind",
          type: "select",
          options: [
            { value: "supplier", label: language === "es" ? "Proveedor" : "Supplier" },
            { value: "partner", label: language === "es" ? "Partner" : "Partner" },
            { value: "internal", label: language === "es" ? "Interna" : "Internal" },
          ],
        },
        { key: "phone", labelEs: "Teléfono central", labelEn: "Main phone" },
        { key: "email", labelEs: "Email central", labelEn: "Main email", type: "email" },
        { key: "street", labelEs: "Calle", labelEn: "Street" },
        { key: "streetNumber", labelEs: "Número", labelEn: "Number" },
        { key: "commune", labelEs: "Comuna", labelEn: "Commune" },
        { key: "city", labelEs: "Ciudad", labelEn: "City" },
        { key: "region", labelEs: "Región", labelEn: "Region" },
        { key: "country_code", labelEs: "País", labelEn: "Country" },
        { key: "primary_contact_name", labelEs: "Contacto principal", labelEn: "Primary contact" },
        { key: "primary_contact_phone", labelEs: "Teléfono contacto", labelEn: "Contact phone" },
        { key: "primary_contact_email", labelEs: "Email contacto", labelEn: "Contact email", type: "email" },
        { key: "is_active", labelEs: "Activa", labelEn: "Active", type: "checkbox" },
        { key: "notes", labelEs: "Notas", labelEn: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "name",
          headerEs: "Organización",
          headerEn: "Organization",
          render: (organization) => (
            <div>
              <div className="business-core-cell__title">{organization.name}</div>
              <div className="business-core-cell__meta">
                {organization.legal_name || (language === "es" ? "sin razón social" : "no legal name")}
              </div>
              <div className="business-core-cell__meta">
                {organization.address_line
                  ? [organization.address_line, organization.commune, organization.city, organization.region]
                      .filter(Boolean)
                      .join(" · ")
                  : language === "es"
                    ? "sin dirección"
                    : "no address"}
              </div>
            </div>
          ),
        },
        {
          key: "contact",
          headerEs: "Contacto principal",
          headerEn: "Primary contact",
          render: (organization, currentLanguage) => {
            const primaryContact =
              contactsByOrganizationId.get(organization.id)?.find((contact) => contact.is_primary) ??
              contactsByOrganizationId.get(organization.id)?.[0] ??
              null;
            return (
              <div>
                <div className="business-core-cell__title">
                  {primaryContact?.full_name ||
                    (currentLanguage === "es" ? "sin contacto" : "no contact")}
                </div>
                <div className="business-core-cell__meta">
                  {[primaryContact?.phone, primaryContact?.email].filter(Boolean).join(" · ") ||
                    "—"}
                </div>
              </div>
            );
          },
        },
        {
          key: "addressReadiness",
          headerEs: "Dirección propia",
          headerEn: "Own address",
          render: (organization, currentLanguage) => {
            const readiness = getAddressReadiness(organization);
            const mapsUrl = buildGoogleMapsUrl(organization);
            return (
              <div>
                <div className="business-core-cell__title">
                  {readiness === "complete"
                    ? currentLanguage === "es"
                      ? "completa"
                      : "complete"
                    : readiness === "partial"
                      ? currentLanguage === "es"
                        ? "parcial"
                        : "partial"
                      : currentLanguage === "es"
                        ? "sin dirección"
                        : "no address"}
                </div>
                <div className="business-core-cell__meta">
                  {organization.address_line
                    ? [organization.address_line, organization.commune, organization.city]
                        .filter(Boolean)
                        .join(" · ")
                    : currentLanguage === "es"
                      ? "falta capturar calle o número"
                      : "street or number still missing"}
                </div>
                <div className="business-core-cell__meta">
                  {readiness === "partial"
                    ? currentLanguage === "es"
                      ? "conviene completar comuna, ciudad o región"
                      : "complete commune, city, or region"
                    : mapsUrl
                      ? currentLanguage === "es"
                        ? "lista para mapa y lectura diaria"
                        : "ready for maps and daily reading"
                      : "—"}
                </div>
              </div>
            );
          },
        },
        {
          key: "operationalPosture",
          headerEs: "Lectura operativa",
          headerEn: "Operational posture",
          render: (organization, currentLanguage) => {
            const linkedClients = clientCountByOrganizationId.get(organization.id) ?? 0;
            const coverage = socialCoverageByOrganizationId.get(organization.id);
            const readiness = getAddressReadiness(organization);
            const hasDifferentiatedLegalName =
              Boolean(organization.legal_name) && organization.legal_name !== organization.name;
            return (
              <div>
                <div className="business-core-cell__title">
                  {readiness === "complete"
                    ? currentLanguage === "es"
                      ? "lectura estable"
                      : "stable reading"
                    : readiness === "partial"
                      ? currentLanguage === "es"
                        ? "lectura parcial"
                        : "partial reading"
                    : currentLanguage === "es"
                      ? "lectura básica"
                      : "basic reading"}
                </div>
                <div className="business-core-cell__meta">
                  {linkedClients
                    ? currentLanguage === "es"
                      ? `${linkedClients} cliente(s) ya ligados`
                      : `${linkedClients} linked client(s)`
                    : currentLanguage === "es"
                      ? "sin clientes ligados en esta vista"
                      : "no linked clients in this view"}
                </div>
                <div className="business-core-cell__meta">
                  {coverage?.groupNames.length
                    ? currentLanguage === "es"
                      ? `${coverage.groupNames.length} grupo(s) social(es) visibles`
                      : `${coverage.groupNames.length} visible social group(s)`
                    : hasDifferentiatedLegalName
                    ? currentLanguage === "es"
                      ? `razón social: ${organization.legal_name}`
                      : `legal name: ${organization.legal_name}`
                    : currentLanguage === "es"
                      ? "sin razón social diferenciada"
                      : "no differentiated legal name"}
                </div>
              </div>
            );
          },
        },
        {
          key: "socialCoverage",
          headerEs: "Cobertura social",
          headerEn: "Social coverage",
          render: (organization, currentLanguage) => {
            const coverage = socialCoverageByOrganizationId.get(organization.id);
            const firstGroups = coverage?.groupNames.slice(0, 2) ?? [];
            return (
              <div>
                <div className="business-core-cell__title">
                  {coverage?.groupNames.length
                    ? firstGroups.join(" · ")
                    : currentLanguage === "es"
                      ? "sin grupo social visible"
                      : "no visible social group"}
                </div>
                <div className="business-core-cell__meta">
                  {coverage?.linkedClients
                    ? currentLanguage === "es"
                      ? `${coverage.definedClients}/${coverage.linkedClients} clientes con grupo`
                      : `${coverage.definedClients}/${coverage.linkedClients} clients with group`
                    : currentLanguage === "es"
                      ? "sin clientes ligados"
                      : "no linked clients"}
                </div>
                <div className="business-core-cell__meta">
                  {coverage?.pendingClients
                    ? currentLanguage === "es"
                      ? `${coverage.pendingClients} pendiente(s) por asignar`
                      : `${coverage.pendingClients} pending assignment(s)`
                    : coverage?.linkedClients
                      ? currentLanguage === "es"
                        ? "sin pendientes visibles"
                        : "no visible pending assignments"
                      : "—"}
                </div>
              </div>
            );
          },
        },
        {
          key: "kind",
          headerEs: "Tipo",
          headerEn: "Kind",
          render: (organization, currentLanguage) => organization.organization_kind === "internal"
            ? currentLanguage === "es" ? "Interna" : "Internal"
            : organization.organization_kind === "supplier"
              ? currentLanguage === "es" ? "Proveedor" : "Supplier"
              : organization.organization_kind === "partner"
                ? "Partner"
                : currentLanguage === "es" ? "Cliente" : "Client",
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (organization, currentLanguage) => (
            <AppBadge tone={organization.is_active ? "success" : "warning"}>
              {organization.is_active
                ? currentLanguage === "es"
                  ? "activa"
                  : "active"
                : currentLanguage === "es"
                  ? "inactiva"
                  : "inactive"}
            </AppBadge>
          ),
        },
        {
          key: "actions",
          headerEs: "Acciones",
          headerEn: "Actions",
          render: (organization, currentLanguage) => (
            <AppToolbar compact>
              {buildGoogleMapsUrl(organization) ? (
                <a
                  className="btn btn-sm btn-outline-secondary"
                  href={buildGoogleMapsUrl(organization) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Maps
                </a>
              ) : null}
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(organization)}>
                {currentLanguage === "es" ? "Editar" : "Edit"}
              </button>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => void handleToggle(organization)}>
                {organization.is_active
                  ? currentLanguage === "es"
                    ? "Desactivar"
                    : "Deactivate"
                  : currentLanguage === "es"
                    ? "Activar"
                    : "Activate"}
              </button>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(organization)}>
                {currentLanguage === "es" ? "Eliminar" : "Delete"}
              </button>
            </AppToolbar>
          ),
        },
      ]}
    />
  );
}
