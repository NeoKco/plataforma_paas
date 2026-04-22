import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../../components/common/StatusBadge";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppSpotlight } from "../../../../../design-system/AppSpotlight";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import {
  pickLocalizedText,
  useLanguage,
} from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import type { ApiError } from "../../../../../types";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../services/clientsService";
import {
  getTenantBusinessAssets,
  type TenantBusinessAsset,
} from "../services/assetsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../services/organizationsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../services/sitesService";
import { getVisibleAddressLabel } from "../utils/addressPresentation";

type LatestClientRow = {
  client: TenantBusinessClient;
  organization: TenantBusinessOrganization | null;
};

type AssetSiteRow = {
  site: TenantBusinessSite;
  client: TenantBusinessClient | null;
  organization: TenantBusinessOrganization | null;
  totalAssets: number;
  activeAssets: number;
  inactiveAssets: number;
  assetTypesCount: number;
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
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [assets, setAssets] = useState<TenantBusinessAsset[]>([]);
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
      getTenantBusinessSites(session.accessToken, {
        includeInactive: true,
      }),
      getTenantBusinessAssets(session.accessToken, {
        includeInactive: true,
      }),
    ])
      .then(
        ([
          organizationsResponse,
          clientsResponse,
          sitesResponse,
          assetsResponse,
        ]) => {
        if (!isMounted) {
          return;
        }
        setOrganizations(organizationsResponse.data);
        setClients(clientsResponse.data);
        setSites(sitesResponse.data);
        setAssets(assetsResponse.data);
        }
      )
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

  const visibleAssets = useMemo(
    () => assets.filter((asset) => asset.is_active),
    [assets]
  );

  const topAssetSites = useMemo<AssetSiteRow[]>(() => {
    const clientsById = new Map(clients.map((client) => [client.id, client]));
    const organizationsById = new Map(
      organizations.map((organization) => [organization.id, organization])
    );
    const assetsBySiteId = new Map<number, TenantBusinessAsset[]>();

    assets.forEach((asset) => {
      const current = assetsBySiteId.get(asset.site_id) ?? [];
      current.push(asset);
      assetsBySiteId.set(asset.site_id, current);
    });

    return sites
      .map((site) => {
        const siteAssets = assetsBySiteId.get(site.id) ?? [];
        const client = clientsById.get(site.client_id) ?? null;
        const organization = client
          ? organizationsById.get(client.organization_id) ?? null
          : null;
        const activeAssets = siteAssets.filter((asset) => asset.is_active).length;
        const assetTypesCount = new Set(
          siteAssets.map((asset) => asset.asset_type_name).filter(Boolean)
        ).size;

        return {
          site,
          client,
          organization,
          totalAssets: siteAssets.length,
          activeAssets,
          inactiveAssets: siteAssets.length - activeAssets,
          assetTypesCount,
        };
      })
      .filter((row) => row.totalAssets > 0)
      .sort((left, right) => {
        if (right.totalAssets !== left.totalAssets) {
          return right.totalAssets - left.totalAssets;
        }
        return right.activeAssets - left.activeAssets;
      })
      .slice(0, 4);
  }, [assets, clients, organizations, sites]);

  const spotlightStats = useMemo(
    () => [
      {
        label: pickLocalizedText(language, {
          es: "Empresas visibles",
          en: "Visible organizations",
        }),
        value: visibleOrganizations.length,
      },
      {
        label: pickLocalizedText(language, {
          es: "Clientes visibles",
          en: "Visible clients",
        }),
        value: clients.length,
      },
      {
        label: pickLocalizedText(language, {
          es: "Activos visibles",
          en: "Visible assets",
        }),
        value: visibleAssets.length,
      },
    ],
    [clients.length, language, visibleAssets.length, visibleOrganizations.length]
  );

  return (
    <div className="d-grid gap-4">
      <div className="d-grid gap-4">
        <PageHeader
          eyebrow={pickLocalizedText(language, {
            es: "Core de negocio",
            en: "Business core",
          })}
          icon="business-core"
          title={pickLocalizedText(language, {
            es: "Base compartida tenant",
            en: "Shared tenant base",
          })}
          description={pickLocalizedText(language, {
            es: "Primer slice para normalizar empresas, clientes, contactos y direcciones antes de seguir con Mantenciones.",
            en: "First slice to normalize organizations, clients, contacts, and addresses before continuing with Maintenance.",
          })}
        />
        <BusinessCoreModuleNav />
        <AppSpotlight
          icon="business-core"
          eyebrow={pickLocalizedText(language, {
            es: "Dominio transversal",
            en: "Shared domain",
          })}
          title={pickLocalizedText(language, {
            es: "Base maestra reutilizable",
            en: "Reusable master base",
          })}
          description={pickLocalizedText(language, {
            es: "El primer corte técnico se centra en empresas, clientes, contactos y direcciones. Grupos, perfiles funcionales y tipos de tarea quedan como taxonomía compartida para los siguientes módulos.",
            en: "The first technical wave focuses on organizations, clients, contacts, and addresses. Work groups, functional profiles, and task types remain as the shared taxonomy for the next modules.",
          })}
          stats={spotlightStats}
        />
        <PanelCard
          title={pickLocalizedText(language, {
            es: "Limpieza de duplicados",
            en: "Duplicate cleanup",
          })}
          subtitle={pickLocalizedText(language, {
            es: "Si no encuentras el slice, está dentro de Core de negocio y ahora aparece como Duplicados en la navegación superior.",
            en: "If you cannot find the slice, it lives inside Business core and now appears as Duplicates in the top navigation.",
          })}
        >
          <div className="business-core-card__actions">
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => navigate("/tenant-portal/business-core/duplicates")}
            >
              {pickLocalizedText(language, {
                es: "Abrir duplicados",
                en: "Open duplicates",
              })}
            </button>
            <div className="business-core-cell__meta">
              {pickLocalizedText(language, {
                es: "Ruta directa: /tenant-portal/business-core/duplicates",
                en: "Direct route: /tenant-portal/business-core/duplicates",
              })}
            </div>
          </div>
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
            label={language === "es" ? "Activos visibles" : "Visible assets"}
            value={visibleAssets.length}
            hint={
              language === "es"
                ? "Inventario reusable hoy disponible"
                : "Reusable inventory currently available"
            }
            icon="categories"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Sitios con activos" : "Sites with assets"}
            value={topAssetSites.length}
            hint={
              language === "es"
                ? "Lectura rápida del inventario por sitio"
                : "Quick inventory signal by site"
            }
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

          <PanelCard
            title={
              language === "es"
                ? "Activos reutilizables por sitio"
                : "Reusable assets by site"
            }
            subtitle={
              language === "es"
                ? "Entrada rápida a los sitios que hoy ya concentran inventario visible dentro del dominio."
                : "Quick view of the sites that already concentrate visible inventory in the domain."
            }
          >
            <div className="business-core-stack">
              {topAssetSites.length > 0 ? (
                topAssetSites.map((row) => (
                  <div className="business-core-related-card" key={row.site.id}>
                    <div className="business-core-related-title">
                      {getVisibleAddressLabel(row.site)}
                      <StatusBadge value={row.activeAssets > 0 ? "active" : "inactive"} />
                    </div>
                    <div className="business-core-cell__meta">
                      {row.organization?.name ||
                        row.organization?.legal_name ||
                        (language === "es" ? "Sin cliente asociado" : "No linked client")}
                    </div>
                    <div className="business-core-cell__meta">
                      {language === "es" ? "Activos visibles" : "Visible assets"}:{" "}
                      {row.totalAssets} · {language === "es" ? "Activos" : "Active"}:{" "}
                      {row.activeAssets} · {language === "es" ? "Inactivos" : "Inactive"}:{" "}
                      {row.inactiveAssets}
                    </div>
                    <div className="business-core-cell__meta">
                      {language === "es" ? "Tipos presentes" : "Types present"}:{" "}
                      {row.assetTypesCount}
                    </div>
                    <div className="business-core-card__actions">
                      {row.client ? (
                        <button
                          className="btn btn-outline-primary btn-sm"
                          type="button"
                          onClick={() =>
                            navigate(`/tenant-portal/business-core/clients/${row.client?.id}`)
                          }
                        >
                          {language === "es" ? "Abrir ficha cliente" : "Open client detail"}
                        </button>
                      ) : null}
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/tenant-portal/business-core/assets?siteId=${row.site.id}&source=business-core&q=${encodeURIComponent(
                              row.site.address_line ?? ""
                            )}`
                          )
                        }
                      >
                        {language === "es" ? "Activos sitio" : "Site assets"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-secondary">
                  {language === "es"
                    ? "Aún no hay sitios con inventario visible."
                    : "There are no sites with visible inventory yet."}
                </div>
              )}
            </div>
          </PanelCard>
        </div>
      ) : null}
    </div>
  );
}
