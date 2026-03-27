import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  getPlatformTenantRetirementArchive,
  listPlatformTenantRetirementArchives,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import type { ApiError, PlatformTenantRetirementArchiveItem } from "../../../../types";
import { displayPlatformCode } from "../../../../utils/platform-labels";

export function TenantHistoryPage() {
  const { session } = useAuth();
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
  const [retirementSearch, setRetirementSearch] = useState("");

  const filteredRetirementArchives = useMemo(() => {
    const search = retirementSearch.trim().toLowerCase();
    if (!search) {
      return retirementArchives;
    }

    return retirementArchives.filter((archive) => {
      return (
        archive.tenant_name.toLowerCase().includes(search) ||
        archive.tenant_slug.toLowerCase().includes(search) ||
        archive.tenant_type.toLowerCase().includes(search) ||
        (archive.deleted_by_email || "").toLowerCase().includes(search) ||
        (archive.billing_provider || "").toLowerCase().includes(search) ||
        (archive.billing_status || "").toLowerCase().includes(search)
      );
    });
  }, [retirementArchives, retirementSearch]);

  async function loadRetirementArchives() {
    if (!session?.accessToken) {
      return;
    }

    setIsRetirementArchivesLoading(true);
    setRetirementArchivesError(null);
    try {
      const response = await listPlatformTenantRetirementArchives(
        session.accessToken,
        { limit: 100 }
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
    void loadRetirementArchives();
  }, [session?.accessToken]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Plataforma"
        title="Histórico tenants"
        description="Archivo de tenants retirados del catálogo activo, con snapshot funcional resumido para auditoría y soporte post mortem."
        actions={
          <Link className="btn btn-outline-primary" to="/tenants">
            Volver a Tenants
          </Link>
        }
      />

      <PanelCard
        title="Archivo histórico"
        subtitle="Consulta retirados recientes, filtra por actor o billing y abre el detalle solo cuando lo necesites."
      >
        <input
          className="form-control"
          value={retirementSearch}
          onChange={(event) => setRetirementSearch(event.target.value)}
          placeholder="Buscar por nombre, slug, actor o billing"
        />

        {isRetirementArchivesLoading ? (
          <LoadingBlock label="Cargando archivo histórico..." />
        ) : null}

        {retirementArchivesError ? (
          <ErrorState
            title="No se pudo leer el archivo histórico"
            detail={
              retirementArchivesError.payload?.detail ||
              retirementArchivesError.message
            }
            requestId={retirementArchivesError.payload?.request_id}
          />
        ) : null}

        {!isRetirementArchivesLoading &&
        !retirementArchivesError &&
        retirementArchives.length === 0 ? (
          <EmptyState
            title="Aún no hay tenants retirados archivados"
            detail="Cuando elimines tenants archivados y desprovisionados, aparecerán aquí con su snapshot de retiro."
          />
        ) : null}

        {!isRetirementArchivesLoading &&
        !retirementArchivesError &&
        retirementArchives.length > 0 &&
        filteredRetirementArchives.length === 0 ? (
          <EmptyState
            title="No hay coincidencias para este filtro"
            detail="Prueba con menos texto o cambia la búsqueda por slug, actor o billing."
          />
        ) : null}

        {!isRetirementArchivesLoading &&
        !retirementArchivesError &&
        filteredRetirementArchives.length > 0 ? (
          <DataTableCard
            title="Retirados recientes"
            rows={filteredRetirementArchives}
            columns={[
              {
                key: "deleted_at",
                header: "Retirado en",
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
                header: "Actor",
                render: (row) => row.deleted_by_email || "sistema",
              },
              {
                key: "billing_status",
                header: "Billing final",
                render: (row) =>
                  row.billing_status
                    ? displayPlatformCode(row.billing_status)
                    : "ninguno",
              },
              {
                key: "billing_events_count",
                header: "Eventos",
                render: (row) =>
                  `${row.billing_events_count} billing / ${row.policy_events_count} policy / ${row.provisioning_jobs_count} jobs`,
              },
              {
                key: "actions",
                header: "Detalle",
                render: (row) => (
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
                      ? "Ocultar detalle"
                      : "Ver detalle"}
                  </button>
                ),
              },
            ]}
          />
        ) : null}
      </PanelCard>

      {isRetirementArchiveDetailLoading ? (
        <LoadingBlock label="Cargando detalle del archivo histórico..." />
      ) : null}

      {retirementArchiveDetailError ? (
        <ErrorState
          title="No se pudo leer el detalle del archivo histórico"
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
            title={`Detalle histórico: ${selectedRetirementArchive.tenant_name}`}
            subtitle="Snapshot resumido guardado al momento del retiro definitivo."
          >
            <div className="tenant-detail-grid">
              <DetailField
                label="Slug"
                value={<code>{selectedRetirementArchive.tenant_slug}</code>}
              />
              <DetailField
                label="Retirado en"
                value={formatDateTime(selectedRetirementArchive.deleted_at)}
              />
              <DetailField
                label="Actor"
                value={selectedRetirementArchive.deleted_by_email || "sistema"}
              />
              <DetailField
                label="Billing final"
                value={
                  selectedRetirementArchive.billing_status
                    ? displayPlatformCode(selectedRetirementArchive.billing_status)
                    : "ninguno"
                }
              />
            </div>

            <div className="tenant-inline-note">
              Policy efectiva al retiro: {formatArchiveAccessPolicy(selectedRetirementSummary)}
            </div>

            <div className="tenant-inline-note">
              Límites efectivos: {formatArchiveModuleLimits(selectedRetirementSummary)}
            </div>
          </PanelCard>

          {extractArchiveRows(selectedRetirementSummary, [
            "retirement",
            "recent_billing_events",
          ]).length > 0 ? (
            <DataTableCard
              title="Billing reciente"
              rows={extractArchiveRows(selectedRetirementSummary, [
                "retirement",
                "recent_billing_events",
              ])}
              columns={[
                {
                  key: "recorded_at",
                  header: "Registrado",
                  render: (row) => formatDateTime(readArchiveString(row, "recorded_at")),
                },
                {
                  key: "event_type",
                  header: "Evento",
                  render: (row) => readArchiveString(row, "event_type") || "n/a",
                },
                {
                  key: "provider",
                  header: "Proveedor",
                  render: (row) => readArchiveString(row, "provider") || "n/a",
                },
                {
                  key: "processing_result",
                  header: "Resultado",
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
              title="Cambios de política recientes"
              rows={extractArchiveRows(selectedRetirementSummary, [
                "retirement",
                "recent_policy_events",
              ])}
              columns={[
                {
                  key: "recorded_at",
                  header: "Registrado",
                  render: (row) => formatDateTime(readArchiveString(row, "recorded_at")),
                },
                {
                  key: "event_type",
                  header: "Evento",
                  render: (row) => readArchiveString(row, "event_type") || "n/a",
                },
                {
                  key: "actor_email",
                  header: "Actor",
                  render: (row) =>
                    readArchiveString(row, "actor_email") ||
                    readArchiveString(row, "actor_role") ||
                    "sistema",
                },
                {
                  key: "changed_fields",
                  header: "Campos",
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
              title="Jobs técnicos recientes"
              rows={extractArchiveRows(selectedRetirementSummary, [
                "retirement",
                "recent_provisioning_jobs",
              ])}
              columns={[
                {
                  key: "created_at",
                  header: "Creado",
                  render: (row) => formatDateTime(readArchiveString(row, "created_at")),
                },
                {
                  key: "job_type",
                  header: "Tipo",
                  render: (row) =>
                    formatProvisioningJobType(
                      readArchiveString(row, "job_type") || "unknown"
                    ),
                },
                {
                  key: "status",
                  header: "Estado",
                  render: (row) =>
                    readArchiveString(row, "status") ? (
                      <StatusBadge value={readArchiveString(row, "status") || "unknown"} />
                    ) : (
                      "n/a"
                    ),
                },
                {
                  key: "attempts",
                  header: "Intentos",
                  render: (row) =>
                    `${readArchiveNumber(row, "attempts") ?? 0}/${readArchiveNumber(
                      row,
                      "max_attempts"
                    ) ?? 0}`,
                },
                {
                  key: "error_code",
                  header: "Error",
                  render: (row) => readArchiveString(row, "error_code") || "ninguno",
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
  if (!value) {
    return "n/a";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
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
  if (!Array.isArray(value)) {
    return "ninguno";
  }
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items.join(", ") : "ninguno";
}

function formatArchiveAccessPolicy(
  summary: Record<string, unknown> | null
): string {
  const accessPolicy = readArchiveObject(summary, "access_policy");
  if (!accessPolicy) {
    return "sin snapshot";
  }
  const allowed = accessPolicy.allowed === true;
  const detail =
    typeof accessPolicy.detail === "string" ? accessPolicy.detail : null;
  const source =
    typeof accessPolicy.blocking_source === "string"
      ? accessPolicy.blocking_source
      : null;

  if (allowed) {
    return detail ? `permitido (${detail})` : "permitido";
  }
  return source && detail ? `bloqueado por ${source}: ${detail}` : detail || "bloqueado";
}

function formatArchiveModuleLimits(
  summary: Record<string, unknown> | null
): string {
  const tenantSnapshot = readArchiveObject(summary, "tenant");
  if (!tenantSnapshot) {
    return "sin snapshot";
  }
  const limits = readArchiveObject(tenantSnapshot, "effective_module_limits");
  if (!limits) {
    return "sin límites efectivos";
  }
  const entries = Object.entries(limits).filter(
    ([, value]) => typeof value === "number"
  );
  if (entries.length === 0) {
    return "sin límites efectivos";
  }
  return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
}

function formatProvisioningJobType(value: string): string {
  const knownLabels: Record<string, string> = {
    create_tenant_database: "Crear base del tenant",
    deprovision_tenant_database: "Desprovisionar base del tenant",
    sync_tenant_schema: "Sincronizar esquema tenant",
  };

  return knownLabels[value] || displayPlatformCode(value);
}
