import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../../components/common/StatusBadge";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import type { ApiError } from "../../../../../types";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../services/organizationsService";

type LatestClientRow = {
  client: TenantBusinessClient;
  organization: TenantBusinessOrganization | null;
};

function formatDateTime(
  value: string,
  language: "es" | "en",
  timeZone?: string | null
) {
  return formatDateTimeInTimeZone(value, language, timeZone);
}

export function BusinessCoreOverviewPage() {
  const { language } = useLanguage();
  const { session, effectiveTimeZone } = useTenantAuth();
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    Promise.all([
      getTenantBusinessOrganizations(session.accessToken, {
        includeInactive: true,
      }),
      getTenantBusinessClients(session.accessToken, {
        includeInactive: true,
      }),
    ])
      .then(([organizationsResponse, clientsResponse]) => {
        if (!isMounted) {
          return;
        }
        setOrganizations(organizationsResponse.data);
        setClients(clientsResponse.data);
      })
      .catch((rawError) => {
        if (!isMounted) {
          return;
        }
        setError(rawError as ApiError);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  const clientOrganizationIds = useMemo(() => {
    return new Set(clients.map((client) => client.organization_id));
  }, [clients]);

  const visibleOrganizations = useMemo(() => {
    return organizations.filter(
      (organization) => !clientOrganizationIds.has(organization.id)
    );
  }, [clientOrganizationIds, organizations]);

  const latestOrganizations = useMemo(() => {
    return [...visibleOrganizations]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 2);
  }, [visibleOrganizations]);

  const latestClients = useMemo<LatestClientRow[]>(() => {
    const organizationsById = new Map(
      organizations.map((organization) => [organization.id, organization])
    );
    return [...clients]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 5)
      .map((client) => ({
        client,
        organization: organizationsById.get(client.organization_id) || null,
      }));
  }, [clients, organizations]);

  return (
    <div className="d-grid gap-4">
      <div className="d-grid gap-4">
        <PageHeader
          eyebrow={language === "es" ? "Core de negocio" : "Business core"}
          icon="business-core"
          title={language === "es" ? "Base compartida tenant" : "Shared tenant base"}
          description={
            language === "es"
              ? "Primer slice para normalizar empresas, clientes, contactos y direcciones antes de seguir con Mantenciones."
              : "First slice to normalize organizations, clients, contacts, and addresses before continuing with Maintenance."
          }
        />
        <BusinessCoreModuleNav />
        <PanelCard
          title={language === "es" ? "Dominio transversal" : "Shared domain"}
          subtitle={
            language === "es"
              ? "Este frente define la base tenant que luego reutilizan Mantenciones, Proyectos e IoT."
              : "This front defines the tenant base later reused by Maintenance, Projects, and IoT."
          }
        >
          <p className="mb-0 text-secondary">
            {language === "es"
              ? "El primer corte técnico se centra en empresas, clientes, contactos y direcciones. Grupos, perfiles funcionales y tipos de tarea quedan como la taxonomía compartida del segundo bloque."
              : "The first technical wave focuses on organizations, clients, contacts, and addresses. Work groups, functional profiles, and task types remain as the shared taxonomy of the second block."}
          </p>
        </PanelCard>
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Empresas visibles" : "Visible organizations"}
            value={visibleOrganizations.length}
            hint={language === "es" ? "Contrapartes del catálogo Empresa" : "Counterparties from the Organizations catalog"}
            icon="business-core"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Clientes visibles" : "Visible clients"}
            value={clients.length}
            hint={language === "es" ? "Cartera operativa actual" : "Current operational portfolio"}
            icon="accounts"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Consumidores" : "Consumers"}
            value="3"
            hint={language === "es" ? "Maintenance, Projects, IoT" : "Maintenance, Projects, IoT"}
            icon="categories"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Riesgo evitado" : "Risk avoided"}
            value={language === "es" ? "Duplicación" : "Duplication"}
            hint={language === "es" ? "No mezclar dominio en módulos operativos" : "No domain duplication in operational modules"}
            icon="focus"
            tone="success"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando resumen real de core de negocio..."
              : "Loading live business core overview..."
          }
        />
      ) : null}

      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "No se pudo cargar el resumen de core de negocio"
              : "Business core overview could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {!isLoading && !error ? (
        <div className="business-core-detail-grid">
          <PanelCard
            title={language === "es" ? "Últimas empresas creadas" : "Latest organizations created"}
            subtitle={
              language === "es"
                ? "Entrada rápida a las últimas contrapartes dadas de alta en Empresa."
                : "Quick view of the latest counterparties created in Organizations."
            }
          >
            <div className="business-core-stack">
              {latestOrganizations.length > 0 ? (
                latestOrganizations.map((organization) => (
                  <div className="business-core-related-card" key={organization.id}>
                    <div className="business-core-related-title">
                      {organization.name}
                      <StatusBadge value={organization.is_active ? "active" : "inactive"} />
                    </div>
                    <div className="business-core-cell__meta">
                      {organization.legal_name || organization.name}
                    </div>
                    <div className="business-core-cell__meta">
                      {language === "es" ? "Creada" : "Created"}:{" "}
                      {formatDateTime(
                        organization.created_at,
                        language,
                        effectiveTimeZone
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-secondary">
                  {language === "es"
                    ? "Aún no hay empresas creadas."
                    : "There are no organizations yet."}
                </div>
              )}
            </div>
          </PanelCard>

          <PanelCard
            title={language === "es" ? "Últimos clientes creados" : "Latest clients created"}
            subtitle={
              language === "es"
                ? "Entrada rápida a las últimas altas reales de la cartera de clientes."
                : "Quick view of the latest real additions to the client portfolio."
            }
          >
            <div className="business-core-stack">
              {latestClients.length > 0 ? (
                latestClients.map(({ client, organization }) => (
                  <div className="business-core-related-card" key={client.id}>
                    <div className="business-core-related-title">
                      {organization?.name || organization?.legal_name || `Cliente #${client.id}`}
                      <StatusBadge value={client.is_active ? "active" : "inactive"} />
                    </div>
                    <div className="business-core-cell__meta">
                      {organization?.legal_name && organization.legal_name !== organization.name
                        ? organization.legal_name
                        : language === "es"
                          ? "Sin razon social adicional"
                          : "No additional legal name"}
                    </div>
                    <div className="business-core-cell__meta">
                      {language === "es" ? "RUT / Tax ID" : "Tax ID"}:{" "}
                      {organization?.tax_id || "n/a"}
                    </div>
                    <div className="business-core-cell__meta">
                      {language === "es" ? "Contacto base" : "Base contact"}:{" "}
                      {[organization?.phone, organization?.email].filter(Boolean).join(" · ") ||
                        (language === "es" ? "Sin telefono ni mail" : "No phone or email")}
                    </div>
                    <div className="business-core-cell__meta">
                      {language === "es" ? "Estado servicio" : "Service status"}:{" "}
                      {client.service_status || "n/a"} · {language === "es" ? "Creado" : "Created"}:{" "}
                      {formatDateTime(client.created_at, language, effectiveTimeZone)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-secondary">
                  {language === "es"
                    ? "Aún no hay clientes creados."
                    : "There are no clients yet."}
                </div>
              )}
            </div>
          </PanelCard>
        </div>
      ) : null}
    </div>
  );
}
