import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { AppFilterGrid, AppToolbar } from "../../../../design-system/AppLayout";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  getPlatformTenantRetirementArchive,
  listPlatformTenantRetirementArchives,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import { useLanguage } from "../../../../store/language-context";
import type { ApiError, PlatformTenantRetirementArchiveItem } from "../../../../types";
import { getCurrentLanguage, getCurrentLocale } from "../../../../utils/i18n";
import { displayPlatformCode } from "../../../../utils/platform-labels";

type RetirementArchiveFilters = {
  search: string;
  tenantType: string;
  billingStatus: string;
  actorEmail: string;
  deletedFrom: string;
  deletedTo: string;
};

const EMPTY_RETIREMENT_FILTERS: RetirementArchiveFilters = {
  search: "",
  tenantType: "all",
  billingStatus: "all",
  actorEmail: "",
  deletedFrom: "",
  deletedTo: "",
};

export function TenantHistoryPage() {
  const { session } = useAuth();
  const { language } = useLanguage();
  const [retirementArchives, setRetirementArchives] = useState<
    PlatformTenantRetirementArchiveItem[]
  >([]);
  const [selectedRetirementArchiveId, setSelectedRetirementArchiveId] = useState<
    number | null
  >(null);
  const [selectedRetirementArchive, setSelectedRetirementArchive] =
    useState<PlatformTenantRetirementArchiveItem | null>(null);
  const [selectedRetirementSummary, setSelectedRetirementSummary] = useState<
    Record<string, unknown> | null
  >(null);
  const [retirementArchivesError, setRetirementArchivesError] = useState<ApiError | null>(
    null
  );
  const [retirementArchiveDetailError, setRetirementArchiveDetailError] =
    useState<ApiError | null>(null);
  const [isRetirementArchivesLoading, setIsRetirementArchivesLoading] = useState(true);
  const [isRetirementArchiveDetailLoading, setIsRetirementArchiveDetailLoading] =
    useState(false);
  const [retirementFilters, setRetirementFilters] = useState<RetirementArchiveFilters>(
    EMPTY_RETIREMENT_FILTERS
  );

  const tenantTypeOptions = useMemo(
    () =>
      buildArchiveOptions([
        ...retirementArchives.map((archive) => archive.tenant_type),
        retirementFilters.tenantType !== "all" ? retirementFilters.tenantType : null,
      ]),
    [retirementArchives, retirementFilters.tenantType]
  );
  const billingStatusOptions = useMemo(
    () =>
      buildArchiveOptions(
        [
          ...retirementArchives
            .map((archive) => archive.billing_status)
            .filter((value): value is string => Boolean(value)),
          retirementFilters.billingStatus !== "all"
            ? retirementFilters.billingStatus
            : null,
        ]
      ),
    [retirementArchives, retirementFilters.billingStatus]
  );
  const hasActiveRetirementFilters = useMemo(
    () =>
      Object.values(buildRetirementArchiveExportFilters(retirementFilters)).some(
        (value) => value !== null
      ),
    [retirementFilters]
  );

  async function loadRetirementArchives(
    filters: RetirementArchiveFilters = retirementFilters
  ) {
    if (!session?.accessToken) {
      return;
    }

    setIsRetirementArchivesLoading(true);
    setRetirementArchivesError(null);
    try {
      const response = await listPlatformTenantRetirementArchives(
        session.accessToken,
        buildRetirementArchiveQuery(filters)
      );
      setRetirementArchives(response.data);
      const hasSelectedArchive =
        selectedRetirementArchiveId !== null &&
        response.data.some((archive) => archive.id === selectedRetirementArchiveId);
      if (hasSelectedArchive && selectedRetirementArchiveId !== null) {
        await loadRetirementArchiveDetail(selectedRetirementArchiveId);
      } else {
        setSelectedRetirementArchiveId(null);
        setSelectedRetirementArchive(null);
        setSelectedRetirementSummary(null);
        setRetirementArchiveDetailError(null);
      }
    } catch (rawError) {
      setRetirementArchivesError(rawError as ApiError);
      setRetirementArchives([]);
      setSelectedRetirementArchiveId(null);
      setSelectedRetirementArchive(null);
      setSelectedRetirementSummary(null);
    } finally {
      setIsRetirementArchivesLoading(false);
    }
  }

  async function loadRetirementArchiveDetail(archiveId: number) {
    if (!session?.accessToken) {
      return;
    }

    setIsRetirementArchiveDetailLoading(true);
    setRetirementArchiveDetailError(null);
    try {
      const response = await getPlatformTenantRetirementArchive(
        session.accessToken,
        archiveId
      );
      setSelectedRetirementArchive(response.data);
      setSelectedRetirementSummary(response.summary);
    } catch (rawError) {
      setSelectedRetirementArchive(null);
      setSelectedRetirementSummary(null);
      setRetirementArchiveDetailError(rawError as ApiError);
    } finally {
      setIsRetirementArchiveDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    void loadRetirementArchives(EMPTY_RETIREMENT_FILTERS);
  }, [session?.accessToken]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Plataforma" : "Platform"}
        title={language === "es" ? "Histórico tenants" : "Tenant history"}
        description={
          language === "es"
            ? "Archivo de tenants retirados del catálogo activo, con snapshot funcional resumido para auditoría y soporte post mortem."
            : "Archive of tenants retired from the active catalog, with a summarized functional snapshot for audit and post-mortem support."
        }
        icon="tenant-history"
        actions={
          <AppToolbar compact>
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() =>
                downloadTextFile(
                  buildRetirementArchiveCsv(retirementArchives, language),
                  "tenant-retirement-archives.csv",
                  "text/csv;charset=utf-8;"
                )
              }
              disabled={retirementArchives.length === 0}
            >
              {language === "es" ? "Exportar CSV" : "Export CSV"}
            </button>
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() =>
                downloadTextFile(
                  JSON.stringify(
                    {
                      exported_at: new Date().toISOString(),
                      filters: buildRetirementArchiveExportFilters(retirementFilters),
                      rows: retirementArchives,
                    },
                    null,
                    2
                  ),
                  "tenant-retirement-archives.json",
                  "application/json;charset=utf-8;"
                )
              }
              disabled={retirementArchives.length === 0}
            >
              {language === "es" ? "Exportar JSON" : "Export JSON"}
            </button>
            <Link className="btn btn-outline-primary" to="/tenants">
              {language === "es" ? "Volver a Tenants" : "Back to Tenants"}
            </Link>
          </AppToolbar>
        }
      />

      <PanelCard
        icon="catalogs"
        title={language === "es" ? "Archivo histórico" : "Historical archive"}
        subtitle={
          language === "es"
            ? "Consulta retirados recientes, filtra por actor o billing y abre el detalle solo cuando lo necesites."
            : "Review recent retirements, filter by actor or billing and open the detail only when needed."
        }
      >
        <AppFilterGrid className="tenant-catalog-filters">
          <input
            className="form-control"
            value={retirementFilters.search}
            onChange={(event) =>
              setRetirementFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            placeholder={
              language === "es"
                ? "Buscar por nombre, slug, actor o billing"
                : "Search by name, slug, actor or billing"
            }
          />
          <select
            className="form-select"
            value={retirementFilters.tenantType}
            onChange={(event) =>
              setRetirementFilters((current) => ({
                ...current,
                tenantType: event.target.value,
              }))
            }
          >
            <option value="all">{language === "es" ? "Todos los tipos" : "All types"}</option>
            {tenantTypeOptions.map((value) => (
              <option key={value} value={value}>
                {displayPlatformCode(value, language)}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            value={retirementFilters.billingStatus}
            onChange={(event) =>
              setRetirementFilters((current) => ({
                ...current,
                billingStatus: event.target.value,
              }))
            }
          >
            <option value="all">
              {language === "es" ? "Todo billing" : "All billing"}
            </option>
            {billingStatusOptions.map((value) => (
              <option key={value} value={value}>
                {displayPlatformCode(value, language)}
              </option>
            ))}
          </select>
          <input
            className="form-control"
            value={retirementFilters.actorEmail}
            onChange={(event) =>
              setRetirementFilters((current) => ({
                ...current,
                actorEmail: event.target.value,
              }))
            }
            placeholder={language === "es" ? "Actor email" : "Actor email"}
          />
          <input
            className="form-control"
            type="date"
            value={retirementFilters.deletedFrom}
            onChange={(event) =>
              setRetirementFilters((current) => ({
                ...current,
                deletedFrom: event.target.value,
              }))
            }
            aria-label={language === "es" ? "Retirado desde" : "Retired from"}
          />
          <input
            className="form-control"
            type="date"
            value={retirementFilters.deletedTo}
            onChange={(event) =>
              setRetirementFilters((current) => ({
                ...current,
                deletedTo: event.target.value,
              }))
            }
            aria-label={language === "es" ? "Retirado hasta" : "Retired to"}
          />
        </AppFilterGrid>
        <AppToolbar compact>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => void loadRetirementArchives(retirementFilters)}
            disabled={isRetirementArchivesLoading}
          >
            {language === "es" ? "Aplicar filtros" : "Apply filters"}
          </button>
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => {
              setRetirementFilters(EMPTY_RETIREMENT_FILTERS);
              void loadRetirementArchives(EMPTY_RETIREMENT_FILTERS);
            }}
            disabled={isRetirementArchivesLoading}
          >
            {language === "es" ? "Limpiar" : "Clear"}
          </button>
          <span className="tenant-inline-note">
            {language === "es"
              ? `${retirementArchives.length} retiros visibles`
              : `${retirementArchives.length} visible retirements`}
          </span>
        </AppToolbar>

        {isRetirementArchivesLoading ? (
          <LoadingBlock
            label={language === "es" ? "Cargando archivo histórico..." : "Loading archive..."}
          />
        ) : null}

        {retirementArchivesError ? (
          <ErrorState
            title={
              language === "es"
                ? "No se pudo leer el archivo histórico"
                : "Could not read the archive"
            }
            detail={
              retirementArchivesError.payload?.detail ||
              retirementArchivesError.message
            }
            requestId={retirementArchivesError.payload?.request_id}
          />
        ) : null}

        {!isRetirementArchivesLoading &&
        !retirementArchivesError &&
        !hasActiveRetirementFilters &&
        retirementArchives.length === 0 ? (
          <EmptyState
            title={
              language === "es"
                ? "Aún no hay tenants retirados archivados"
                : "There are no archived retired tenants yet"
            }
            detail={
              language === "es"
                ? "Cuando elimines tenants archivados y desprovisionados, aparecerán aquí con su snapshot de retiro."
                : "When archived and deprovisioned tenants are deleted, they will appear here with their retirement snapshot."
            }
          />
        ) : null}

        {!isRetirementArchivesLoading &&
        !retirementArchivesError &&
        hasActiveRetirementFilters &&
        retirementArchives.length === 0 ? (
          <EmptyState
            title={
              language === "es"
                ? "No hay coincidencias para este filtro"
                : "There are no matches for this filter"
            }
            detail={
              language === "es"
                ? "Prueba con menos filtros o amplía la ventana de fechas."
                : "Try fewer filters or widen the date window."
            }
          />
        ) : null}

        {!isRetirementArchivesLoading &&
        !retirementArchivesError &&
        retirementArchives.length > 0 ? (
          <DataTableCard
            title={language === "es" ? "Retirados recientes" : "Recent retirements"}
            rows={retirementArchives}
            columns={[
              {
                key: "deleted_at",
                header: language === "es" ? "Retirado en" : "Retired at",
                render: (row) => formatDateTime(row.deleted_at),
              },
              {
                key: "tenant_name",
                header: "Tenant",
                render: (row) => (
                  <div>
                    <div>{row.tenant_name}</div>
                    <div className="tenant-list__meta">
                      <code>{row.tenant_slug}</code>
                      <span>{row.tenant_type}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: "deleted_by_email",
                header: language === "es" ? "Actor" : "Actor",
                render: (row) => row.deleted_by_email || (language === "es" ? "sistema" : "system"),
              },
              {
                key: "billing_status",
                header: language === "es" ? "Final billing" : "Final billing",
                render: (row) =>
                  row.billing_status
                    ? displayPlatformCode(row.billing_status, language)
                    : language === "es"
                      ? "ninguno"
                      : "none",
              },
              {
                key: "billing_events_count",
                header: language === "es" ? "Eventos" : "Events",
                render: (row) =>
                  language === "es"
                    ? `${row.billing_events_count} billing / ${row.policy_events_count} policy / ${row.provisioning_jobs_count} jobs`
                    : `${row.billing_events_count} billing / ${row.policy_events_count} policy / ${row.provisioning_jobs_count} jobs`,
              },
              {
                key: "actions",
                header: language === "es" ? "Detalle" : "Detail",
                render: (row) => (
                  <AppToolbar compact>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      type="button"
                      onClick={() => {
                        if (selectedRetirementArchiveId === row.id) {
                          setSelectedRetirementArchiveId(null);
                          setSelectedRetirementArchive(null);
                          setSelectedRetirementSummary(null);
                          setRetirementArchiveDetailError(null);
                          return;
                        }
                        setSelectedRetirementArchiveId(row.id);
                        void loadRetirementArchiveDetail(row.id);
                      }}
                      disabled={isRetirementArchiveDetailLoading}
                    >
                      {selectedRetirementArchiveId === row.id
                        ? language === "es"
                          ? "Ocultar detalle"
                          : "Hide detail"
                        : language === "es"
                          ? "Ver detalle"
                          : "View detail"}
                    </button>
                  </AppToolbar>
                ),
              },
            ]}
          />
        ) : null}
      </PanelCard>

      {isRetirementArchiveDetailLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando detalle del archivo histórico..."
              : "Loading archive detail..."
          }
        />
      ) : null}

      {retirementArchiveDetailError ? (
        <ErrorState
          title={
            language === "es"
              ? "No se pudo leer el detalle del archivo histórico"
              : "Could not read archive detail"
          }
          detail={
            retirementArchiveDetailError.payload?.detail ||
            retirementArchiveDetailError.message
          }
          requestId={retirementArchiveDetailError.payload?.request_id}
        />
      ) : null}

      {selectedRetirementArchive && selectedRetirementSummary ? (
        <>
          <PanelCard
            icon="tenant-history"
            title={
              language === "es"
                ? `Detalle histórico: ${selectedRetirementArchive.tenant_name}`
                : `Historical detail: ${selectedRetirementArchive.tenant_name}`
            }
            subtitle={
              language === "es"
                ? "Snapshot resumido guardado al momento del retiro definitivo."
                : "Summarized snapshot stored at the moment of final retirement."
            }
          >
            <div className="tenant-detail-grid">
              <DetailField
                label="Slug"
                value={<code>{selectedRetirementArchive.tenant_slug}</code>}
              />
              <DetailField
                label={language === "es" ? "Retirado en" : "Retired at"}
                value={formatDateTime(selectedRetirementArchive.deleted_at)}
              />
              <DetailField
                label={language === "es" ? "Actor" : "Actor"}
                value={selectedRetirementArchive.deleted_by_email || (language === "es" ? "sistema" : "system")}
              />
              <DetailField
                label={language === "es" ? "Billing final" : "Final billing"}
                value={
                  selectedRetirementArchive.billing_status
                    ? displayPlatformCode(selectedRetirementArchive.billing_status, language)
                    : language === "es"
                      ? "ninguno"
                      : "none"
                }
              />
            </div>

            <div className="tenant-inline-note">
              {language === "es" ? "Policy efectiva al retiro:" : "Effective policy at retirement:"}{" "}
              {formatArchiveAccessPolicy(selectedRetirementSummary)}
            </div>

            <div className="tenant-inline-note">
              {language === "es" ? "Límites efectivos:" : "Effective limits:"}{" "}
              {formatArchiveModuleLimits(selectedRetirementSummary)}
            </div>
          </PanelCard>

          {extractArchiveRows(selectedRetirementSummary, [
            "retirement",
            "recent_billing_events",
          ]).length > 0 ? (
            <DataTableCard
              title={language === "es" ? "Billing reciente" : "Recent billing"}
              rows={extractArchiveRows(selectedRetirementSummary, [
                "retirement",
                "recent_billing_events",
              ])}
              columns={[
                {
                  key: "recorded_at",
                  header: language === "es" ? "Registrado" : "Recorded",
                  render: (row) => formatDateTime(readArchiveString(row, "recorded_at")),
                },
                {
                  key: "event_type",
                  header: language === "es" ? "Evento" : "Event",
                  render: (row) => readArchiveString(row, "event_type") || "n/a",
                },
                {
                  key: "provider",
                  header: language === "es" ? "Proveedor" : "Provider",
                  render: (row) => readArchiveString(row, "provider") || "n/a",
                },
                {
                  key: "processing_result",
                  header: language === "es" ? "Resultado" : "Result",
                  render: (row) =>
                    readArchiveString(row, "processing_result") || "n/a",
                },
                {
                  key: "billing_status",
                  header: "Billing",
                  render: (row) => readArchiveString(row, "billing_status") || "n/a",
                },
              ]}
            />
          ) : null}

          {extractArchiveRows(selectedRetirementSummary, [
            "retirement",
            "recent_policy_events",
          ]).length > 0 ? (
            <DataTableCard
              title={language === "es" ? "Cambios de política recientes" : "Recent policy changes"}
              rows={extractArchiveRows(selectedRetirementSummary, [
                "retirement",
                "recent_policy_events",
              ])}
              columns={[
                {
                  key: "recorded_at",
                  header: language === "es" ? "Registrado" : "Recorded",
                  render: (row) => formatDateTime(readArchiveString(row, "recorded_at")),
                },
                {
                  key: "event_type",
                  header: language === "es" ? "Evento" : "Event",
                  render: (row) => readArchiveString(row, "event_type") || "n/a",
                },
                {
                  key: "actor_email",
                  header: language === "es" ? "Actor" : "Actor",
                  render: (row) =>
                    readArchiveString(row, "actor_email") ||
                    readArchiveString(row, "actor_role") ||
                    (language === "es" ? "sistema" : "system"),
                },
                {
                  key: "changed_fields",
                  header: language === "es" ? "Campos" : "Fields",
                  render: (row) => formatArchiveStringArray(row.changed_fields),
                },
              ]}
            />
          ) : null}

          {extractArchiveRows(selectedRetirementSummary, [
            "retirement",
            "recent_provisioning_jobs",
          ]).length > 0 ? (
            <DataTableCard
              title={language === "es" ? "Jobs técnicos recientes" : "Recent technical jobs"}
              rows={extractArchiveRows(selectedRetirementSummary, [
                "retirement",
                "recent_provisioning_jobs",
              ])}
              columns={[
                {
                  key: "created_at",
                  header: language === "es" ? "Creado" : "Created",
                  render: (row) => formatDateTime(readArchiveString(row, "created_at")),
                },
                {
                  key: "job_type",
                  header: language === "es" ? "Tipo" : "Type",
                  render: (row) =>
                    formatProvisioningJobType(
                      readArchiveString(row, "job_type") || "unknown"
                    ),
                },
                {
                  key: "status",
                  header: language === "es" ? "Estado" : "Status",
                  render: (row) =>
                    readArchiveString(row, "status") ? (
                      <StatusBadge value={readArchiveString(row, "status") || "unknown"} />
                    ) : (
                      "n/a"
                    ),
                },
                {
                  key: "attempts",
                  header: language === "es" ? "Intentos" : "Attempts",
                  render: (row) =>
                    `${readArchiveNumber(row, "attempts") ?? 0}/${readArchiveNumber(
                      row,
                      "max_attempts"
                    ) ?? 0}`,
                },
                {
                  key: "error_code",
                  header: language === "es" ? "Error" : "Error",
                  render: (row) =>
                    readArchiveString(row, "error_code") ||
                    (language === "es" ? "ninguno" : "none"),
                },
              ]}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="tenant-detail__label">{label}</div>
      <div className="tenant-detail__value">{value}</div>
    </div>
  );
}

function formatDateTime(value: string | null): string {
  const language = getCurrentLanguage();
  if (!value) {
    return language === "es" ? "n/d" : "n/a";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(getCurrentLocale(language));
}

function readArchiveObject(
  value: Record<string, unknown> | null | undefined,
  key: string
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  const next = value[key];
  if (next && typeof next === "object" && !Array.isArray(next)) {
    return next as Record<string, unknown>;
  }
  return null;
}

function extractArchiveRows(
  value: Record<string, unknown> | null | undefined,
  path: string[]
): Array<Record<string, unknown>> {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return [];
    }
    current = (current as Record<string, unknown>)[key];
  }
  if (!Array.isArray(current)) {
    return [];
  }
  return current.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row)
  );
}

function readArchiveString(
  row: Record<string, unknown>,
  key: string
): string | null {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readArchiveNumber(
  row: Record<string, unknown>,
  key: string
): number | null {
  const value = row[key];
  return typeof value === "number" ? value : null;
}

function formatArchiveStringArray(value: unknown): string {
  const language = getCurrentLanguage();
  if (!Array.isArray(value)) {
    return language === "es" ? "ninguno" : "none";
  }
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items.join(", ") : language === "es" ? "ninguno" : "none";
}

function formatArchiveAccessPolicy(
  summary: Record<string, unknown> | null
): string {
  const language = getCurrentLanguage();
  const accessPolicy = readArchiveObject(summary, "access_policy");
  if (!accessPolicy) {
    return language === "es" ? "sin snapshot" : "no snapshot";
  }
  const allowed = accessPolicy.allowed === true;
  const detail =
    typeof accessPolicy.detail === "string" ? accessPolicy.detail : null;
  const source =
    typeof accessPolicy.blocking_source === "string"
      ? accessPolicy.blocking_source
      : null;

  if (allowed) {
    return detail
      ? language === "es"
        ? `permitido (${detail})`
        : `allowed (${detail})`
      : language === "es"
        ? "permitido"
        : "allowed";
  }
  return source && detail
    ? language === "es"
      ? `bloqueado por ${source}: ${detail}`
      : `blocked by ${source}: ${detail}`
    : detail || (language === "es" ? "bloqueado" : "blocked");
}

function formatArchiveModuleLimits(
  summary: Record<string, unknown> | null
): string {
  const language = getCurrentLanguage();
  const tenantSnapshot = readArchiveObject(summary, "tenant");
  if (!tenantSnapshot) {
    return language === "es" ? "sin snapshot" : "no snapshot";
  }
  const limits = readArchiveObject(tenantSnapshot, "effective_module_limits");
  if (!limits) {
    return language === "es" ? "sin límites efectivos" : "no effective limits";
  }
  const entries = Object.entries(limits).filter(
    ([, value]) => typeof value === "number"
  );
  if (entries.length === 0) {
    return language === "es" ? "sin límites efectivos" : "no effective limits";
  }
  return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
}

function formatProvisioningJobType(value: string): string {
  const language = getCurrentLanguage();
  const knownLabels: Record<string, string> = {
    create_tenant_database:
      language === "es" ? "Crear base del tenant" : "Create tenant database",
    deprovision_tenant_database:
      language === "es" ? "Desprovisionar base del tenant" : "Deprovision tenant database",
    sync_tenant_schema:
      language === "es" ? "Sincronizar esquema tenant" : "Sync tenant schema",
  };

  return knownLabels[value] || displayPlatformCode(value);
}

function buildArchiveOptions(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      )
    )
  ).sort((left, right) => left.localeCompare(right));
}

function buildRetirementArchiveQuery(filters: RetirementArchiveFilters) {
  return {
    limit: 100,
    search: filters.search.trim() || undefined,
    tenant_type:
      filters.tenantType !== "all" ? filters.tenantType : undefined,
    billing_status:
      filters.billingStatus !== "all" ? filters.billingStatus : undefined,
    deleted_by_email: filters.actorEmail.trim() || undefined,
    deleted_from: filters.deletedFrom || undefined,
    deleted_to: filters.deletedTo || undefined,
  };
}

function buildRetirementArchiveExportFilters(filters: RetirementArchiveFilters) {
  return {
    search: filters.search.trim() || null,
    tenant_type: filters.tenantType !== "all" ? filters.tenantType : null,
    billing_status:
      filters.billingStatus !== "all" ? filters.billingStatus : null,
    deleted_by_email: filters.actorEmail.trim() || null,
    deleted_from: filters.deletedFrom || null,
    deleted_to: filters.deletedTo || null,
  };
}

function buildRetirementArchiveCsv(
  rows: PlatformTenantRetirementArchiveItem[],
  language: "es" | "en"
): string {
  const header = [
    "id",
    "deleted_at",
    "tenant_name",
    "tenant_slug",
    "tenant_type",
    "plan_code",
    "tenant_status",
    "billing_provider",
    "billing_status",
    "deleted_by_email",
    "tenant_created_at",
    "billing_events_count",
    "policy_events_count",
    "provisioning_jobs_count",
  ];

  const csvRows = [
    header,
    ...rows.map((row) => [
      String(row.id),
      formatDateTime(row.deleted_at),
      row.tenant_name,
      row.tenant_slug,
      displayPlatformCode(row.tenant_type, language),
      row.plan_code || "",
      displayPlatformCode(row.tenant_status, language),
      row.billing_provider || "",
      row.billing_status ? displayPlatformCode(row.billing_status, language) : "",
      row.deleted_by_email || "",
      formatDateTime(row.tenant_created_at),
      String(row.billing_events_count),
      String(row.policy_events_count),
      String(row.provisioning_jobs_count),
    ]),
  ];

  return csvRows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}

function escapeCsvValue(value: string): string {
  const normalized = value.split('"').join('""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
