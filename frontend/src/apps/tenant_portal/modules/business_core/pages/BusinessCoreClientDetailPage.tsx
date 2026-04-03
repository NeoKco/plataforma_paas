import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  getTenantBusinessClient,
  type TenantBusinessClient,
} from "../services/clientsService";
import {
  getTenantBusinessContacts,
  type TenantBusinessContact,
} from "../services/contactsService";
import {
  getTenantBusinessOrganization,
  type TenantBusinessOrganization,
} from "../services/organizationsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../services/sitesService";

function buildGoogleMapsUrl(site: TenantBusinessSite): string | null {
  const query = [site.address_line, site.city, site.region, site.country_code || "Chile"]
    .filter(Boolean)
    .join(", ")
    .trim();
  if (!query) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function BusinessCoreClientDetailPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<TenantBusinessClient | null>(null);
  const [organization, setOrganization] = useState<TenantBusinessOrganization | null>(null);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [addresses, setAddresses] = useState<TenantBusinessSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const primaryContact = useMemo(
    () => contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null,
    [contacts]
  );

  useEffect(() => {
    async function loadData() {
      if (!session?.accessToken || !clientId) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const clientResponse = await getTenantBusinessClient(
          session.accessToken,
          Number(clientId)
        );
        const clientData = clientResponse.data;
        setClient(clientData);

        const [organizationResponse, contactsResponse, addressesResponse] = await Promise.all([
          getTenantBusinessOrganization(session.accessToken, clientData.organization_id),
          getTenantBusinessContacts(session.accessToken, {
            organizationId: clientData.organization_id,
          }),
          getTenantBusinessSites(session.accessToken, { clientId: clientData.id }),
        ]);

        setOrganization(organizationResponse.data);
        setContacts(contactsResponse.data);
        setAddresses(addressesResponse.data);
      } catch (rawError) {
        setError(rawError as ApiError);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [clientId, session?.accessToken]);

  if (isLoading) {
    return <LoadingBlock label={language === "es" ? "Cargando ficha de cliente..." : "Loading client detail..."} />;
  }

  if (error || !client || !organization) {
    return (
      <ErrorState
        title={language === "es" ? "No se pudo cargar la ficha del cliente" : "The client detail could not be loaded"}
        detail={
          error
            ? getApiErrorDisplayMessage(error)
            : language === "es"
              ? "Cliente no encontrado"
              : "Client not found"
        }
        requestId={error?.payload?.request_id}
      />
    );
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Core de negocio" : "Business core"}
        icon="business-core"
        title={organization.name}
        description={
          language === "es"
            ? "Ficha consolidada del cliente: identidad, contactos y direcciones operativas."
            : "Consolidated client detail: identity, contacts, and operating addresses."
        }
        actions={
          <AppToolbar compact>
            <Link className="btn btn-outline-secondary" to="/tenant-portal/business-core/clients">
              {language === "es" ? "Volver a clientes" : "Back to clients"}
            </Link>
            <Link className="btn btn-primary" to="/tenant-portal/business-core/sites">
              {language === "es" ? "Administrar direcciones" : "Manage addresses"}
            </Link>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      <div className="business-core-detail-grid">
        <PanelCard
          title={language === "es" ? "Resumen del cliente" : "Client summary"}
          subtitle={
            language === "es"
              ? "Lectura principal para operación diaria."
              : "Primary reading for day-to-day operation."
          }
        >
          <div className="business-core-detail-list">
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Razón social" : "Legal name"}
              </span>
              <span>{organization.legal_name || organization.name}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">RUT / Tax ID</span>
              <span>{organization.tax_id || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Código cliente" : "Client code"}
              </span>
              <span>{client.client_code || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Estado servicio" : "Service status"}
              </span>
              <AppBadge tone={client.is_active ? "success" : "warning"}>
                {client.service_status}
              </AppBadge>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Contacto principal" : "Primary contact"}
              </span>
              <span>{primaryContact?.full_name || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Teléfono principal" : "Primary phone"}
              </span>
              <span>{primaryContact?.phone || organization.phone || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">Email</span>
              <span>{primaryContact?.email || organization.email || "—"}</span>
            </div>
          </div>
          {client.commercial_notes ? (
            <div className="business-core-detail-note">
              <strong>{language === "es" ? "Notas" : "Notes"}:</strong> {client.commercial_notes}
            </div>
          ) : null}
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Contactos asociados" : "Linked contacts"}
          subtitle={
            language === "es"
              ? "Todos los contactos de la organización base del cliente."
              : "All contacts from the client's base organization."
          }
        >
          {contacts.length === 0 ? (
            <p className="mb-0 text-muted">
              {language === "es"
                ? "Este cliente no tiene contactos cargados."
                : "This client has no contacts yet."}
            </p>
          ) : (
            <div className="business-core-stack">
              {contacts.map((contact) => (
                <div className="business-core-related-card" key={contact.id}>
                  <div className="business-core-related-title">
                    {contact.full_name}
                    {contact.is_primary ? (
                      <AppBadge tone="success">
                        {language === "es" ? "principal" : "primary"}
                      </AppBadge>
                    ) : null}
                  </div>
                  <div className="business-core-cell__meta">
                    {contact.role_title || (language === "es" ? "sin cargo" : "no role")}
                  </div>
                  <div className="business-core-cell__meta">{contact.phone || "—"} · {contact.email || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      <PanelCard
        title={language === "es" ? "Direcciones del cliente" : "Client addresses"}
        subtitle={
          language === "es"
            ? "Direcciones operativas donde luego cuelgan mantenciones, proyectos o activos."
            : "Operating addresses where maintenance, projects, or assets will later hang."
        }
      >
        {addresses.length === 0 ? (
          <p className="mb-0 text-muted">
            {language === "es"
              ? "Este cliente no tiene direcciones cargadas."
              : "This client has no addresses yet."}
          </p>
        ) : (
          <div className="business-core-stack">
            {addresses.map((site) => {
              const mapsUrl = buildGoogleMapsUrl(site);
              return (
                <div className="business-core-related-card" key={site.id}>
                  <div className="business-core-related-title">{site.name}</div>
                  <div className="business-core-cell__meta">
                    {[site.address_line, site.city, site.region].filter(Boolean).join(", ") || "—"}
                  </div>
                  {site.reference_notes ? (
                    <div className="business-core-cell__meta">{site.reference_notes}</div>
                  ) : null}
                  {mapsUrl ? (
                    <div className="mt-2">
                      <a href={mapsUrl} target="_blank" rel="noreferrer">
                        {language === "es" ? "Abrir en Google Maps" : "Open in Google Maps"}
                      </a>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </PanelCard>
    </div>
  );
}
