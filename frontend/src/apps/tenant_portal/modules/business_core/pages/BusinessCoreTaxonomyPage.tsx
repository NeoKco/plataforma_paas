import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar, AppTableWrap } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreHelpBubble } from "../components/common/BusinessCoreHelpBubble";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  getTenantBusinessFunctionProfiles,
  type TenantBusinessFunctionProfile,
} from "../services/functionProfilesService";
import {
  getTenantBusinessTaskTypes,
  type TenantBusinessTaskType,
} from "../services/taskTypesService";
import {
  getTaskTypeAllowedProfileNames,
  stripTaskTypeAllowedProfilesMetadata,
} from "../../maintenance/services/assignmentCapability";
import { stripLegacyVisibleText } from "../utils/taxonomyUi";

export function BusinessCoreTaxonomyPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [taskTypes, setTaskTypes] = useState<TenantBusinessTaskType[]>([]);
  const [functionProfiles, setFunctionProfiles] = useState<TenantBusinessFunctionProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [search, setSearch] = useState("");
  const [showOnlyExplicit, setShowOnlyExplicit] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!session?.accessToken) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [taskTypesResponse, functionProfilesResponse] = await Promise.all([
          getTenantBusinessTaskTypes(session.accessToken, { includeInactive: false }),
          getTenantBusinessFunctionProfiles(session.accessToken, { includeInactive: false }),
        ]);
        setTaskTypes(taskTypesResponse.data);
        setFunctionProfiles(functionProfilesResponse.data);
      } catch (rawError) {
        setError(rawError as ApiError);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [session?.accessToken]);

  const matrixRows = useMemo(
    () =>
      taskTypes.map((taskType) => ({
        taskType,
        allowedProfileNames: getTaskTypeAllowedProfileNames(taskType),
      })),
    [taskTypes]
  );

  const normalizedSearch = search.trim().toLowerCase();
  const visibleRows = useMemo(
    () =>
      matrixRows.filter(({ taskType, allowedProfileNames }) => {
        if (showOnlyExplicit && allowedProfileNames.length === 0) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }
        const haystack = [
          taskType.name,
          taskType.code,
          stripTaskTypeAllowedProfilesMetadata(taskType.description) || "",
          ...allowedProfileNames,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    [matrixRows, normalizedSearch, showOnlyExplicit]
  );

  const explicitMappingsCount = useMemo(
    () => matrixRows.filter((row) => row.allowedProfileNames.length > 0).length,
    [matrixRows]
  );

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Core de negocio" : "Business core"}
        icon="business-core"
        title={language === "es" ? "Taxonomías" : "Taxonomy"}
        description={
          language === "es"
            ? "Vista cruzada entre Tipos de tarea y Perfiles funcionales para revisar compatibilidad operativa sin abrir una migración dedicada todavía."
            : "Cross view between Task types and Functional profiles to review operational compatibility without opening a dedicated migration yet."
        }
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Los perfiles compatibles se editan desde Tipos de tarea. Si un tipo no define perfiles explícitos, Mantenciones lo tratará como compatible con cualquier perfil funcional declarado dentro del grupo responsable."
                  : "Compatible profiles are edited from Task types. If a type does not define explicit profiles, Maintenance treats it as compatible with any declared functional profile inside the responsible group."
              }
            />
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar la taxonomía" : "Could not load taxonomy"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando matriz de taxonomías..."
              : "Loading taxonomy matrix..."
          }
        />
      ) : null}

      <div className="business-core-taxonomy-metrics">
        <PanelCard
          title={language === "es" ? "Tipos de tarea activos" : "Active task types"}
          subtitle={
            language === "es"
              ? "Base preventiva y operativa disponible"
              : "Available preventive and operational base"
          }
        >
          <div className="business-core-taxonomy-metric">{taskTypes.length}</div>
        </PanelCard>
        <PanelCard
          title={language === "es" ? "Perfiles funcionales activos" : "Active function profiles"}
          subtitle={
            language === "es"
              ? "Perfiles reutilizables dentro de grupos"
              : "Reusable profiles inside groups"
          }
        >
          <div className="business-core-taxonomy-metric">{functionProfiles.length}</div>
        </PanelCard>
        <PanelCard
          title={language === "es" ? "Mapeos explícitos" : "Explicit mappings"}
          subtitle={
            language === "es"
              ? "Tipos con perfiles compatibles definidos"
              : "Types with defined compatible profiles"
          }
        >
          <div className="business-core-taxonomy-metric">{explicitMappingsCount}</div>
        </PanelCard>
      </div>

      <PanelCard
        title={language === "es" ? "Lectura operativa" : "Operational view"}
        subtitle={
          language === "es"
            ? "Filtra y revisa rápidamente dónde ya existe compatibilidad fina."
            : "Filter and quickly review where finer compatibility already exists."
        }
      >
        <div className="row g-3 align-items-end mb-3">
          <div className="col-12 col-lg-8">
            <label className="form-label">{language === "es" ? "Buscar" : "Search"}</label>
            <input
              className="form-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                language === "es"
                  ? "Filtra por tipo, código, descripción o perfil"
                  : "Filter by type, code, description, or profile"
              }
            />
          </div>
          <div className="col-12 col-lg-4">
            <label className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={showOnlyExplicit}
                onChange={(event) => setShowOnlyExplicit(event.target.checked)}
              />
              <span className="form-check-label">
                {language === "es"
                  ? "Mostrar solo tipos con compatibilidad explícita"
                  : "Show only types with explicit compatibility"}
              </span>
            </label>
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <div className="alert alert-secondary mb-0">
            {language === "es"
              ? "No hay combinaciones visibles con los filtros actuales."
              : "There are no visible combinations for the current filters."}
          </div>
        ) : (
          <AppTableWrap>
            <table className="table align-middle business-core-taxonomy-table mb-0">
              <thead>
                <tr>
                  <th className="business-core-taxonomy-table__sticky business-core-taxonomy-table__task-column">
                    {language === "es" ? "Tipo de tarea" : "Task type"}
                  </th>
                  {functionProfiles.map((profile) => (
                    <th
                      key={profile.id}
                      className="text-center business-core-taxonomy-table__profile-column"
                    >
                      <div className="business-core-taxonomy-table__profile-title">{profile.name}</div>
                      <div className="business-core-taxonomy-table__profile-code">{profile.code}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ taskType, allowedProfileNames }) => {
                  const hasExplicitProfiles = allowedProfileNames.length > 0;
                  return (
                    <tr key={taskType.id}>
                      <td className="business-core-taxonomy-table__sticky business-core-taxonomy-table__task-cell">
                        <div className="business-core-cell__title d-flex flex-wrap gap-2 align-items-center">
                          <span>{taskType.name}</span>
                          <AppBadge tone={hasExplicitProfiles ? "info" : "neutral"}>
                            {hasExplicitProfiles
                              ? language === "es"
                                ? "explícito"
                                : "explicit"
                              : language === "es"
                                ? "flexible"
                                : "flexible"}
                          </AppBadge>
                        </div>
                        <div className="business-core-cell__meta">{taskType.code}</div>
                        <div className="business-core-cell__meta">
                          {stripLegacyVisibleText(
                            stripTaskTypeAllowedProfilesMetadata(taskType.description)
                          ) || "—"}
                        </div>
                        <div className="d-flex flex-wrap gap-1 mt-2">
                          {hasExplicitProfiles ? (
                            allowedProfileNames.map((profileName) => (
                              <AppBadge key={profileName} tone="info">
                                {profileName}
                              </AppBadge>
                            ))
                          ) : (
                            <AppBadge tone="neutral">
                              {language === "es"
                                ? "Cualquier perfil declarado"
                                : "Any declared profile"}
                            </AppBadge>
                          )}
                        </div>
                      </td>
                      {functionProfiles.map((profile) => {
                        const isCompatible =
                          !hasExplicitProfiles || allowedProfileNames.includes(profile.name);
                        return (
                          <td key={`${taskType.id}:${profile.id}`} className="text-center">
                            <span
                              className={`business-core-taxonomy-table__cell-indicator${
                                isCompatible ? " is-compatible" : ""
                              }`}
                              aria-label={
                                isCompatible
                                  ? language === "es"
                                    ? "Compatible"
                                    : "Compatible"
                                  : language === "es"
                                    ? "No compatible"
                                    : "Not compatible"
                              }
                            >
                              {isCompatible ? "●" : "–"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AppTableWrap>
        )}
      </PanelCard>
    </div>
  );
}
