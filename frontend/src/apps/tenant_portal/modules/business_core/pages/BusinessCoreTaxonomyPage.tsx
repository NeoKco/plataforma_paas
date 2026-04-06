import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar, AppTableWrap } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import {
  pickLocalizedText,
  useLanguage,
} from "../../../../../store/language-context";
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
  getTenantBusinessWorkGroupMembers,
  getTenantBusinessWorkGroups,
  type TenantBusinessWorkGroup,
  type TenantBusinessWorkGroupMember,
} from "../services/workGroupsService";
import {
  getTaskTypeAllowedProfileNames,
  stripTaskTypeAllowedProfilesMetadata,
} from "../../maintenance/services/assignmentCapability";
import { stripLegacyVisibleText } from "../utils/taxonomyUi";

function isMembershipOperationallyActive(member: {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}) {
  if (!member.is_active) {
    return false;
  }
  const now = new Date();
  if (member.starts_at && new Date(member.starts_at) > now) {
    return false;
  }
  if (member.ends_at && new Date(member.ends_at) < now) {
    return false;
  }
  return true;
}

export function BusinessCoreTaxonomyPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const [taskTypes, setTaskTypes] = useState<TenantBusinessTaskType[]>([]);
  const [functionProfiles, setFunctionProfiles] = useState<TenantBusinessFunctionProfile[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [workGroupMembers, setWorkGroupMembers] = useState<TenantBusinessWorkGroupMember[]>([]);
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
        const [taskTypesResponse, functionProfilesResponse, workGroupsResponse] = await Promise.all([
          getTenantBusinessTaskTypes(session.accessToken, { includeInactive: false }),
          getTenantBusinessFunctionProfiles(session.accessToken, { includeInactive: false }),
          getTenantBusinessWorkGroups(session.accessToken, { includeInactive: false }),
        ]);
        const workGroupMembersResponses = await Promise.all(
          workGroupsResponse.data.map((group) =>
            getTenantBusinessWorkGroupMembers(session.accessToken, group.id)
          )
        );
        setTaskTypes(taskTypesResponse.data);
        setFunctionProfiles(functionProfilesResponse.data);
        setWorkGroups(workGroupsResponse.data);
        setWorkGroupMembers(workGroupMembersResponses.flatMap((response) => response.data));
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
  const activeOperationalMembers = useMemo(
    () => workGroupMembers.filter((member) => isMembershipOperationallyActive(member)),
    [workGroupMembers]
  );
  const activeCoverageCountByProfileName = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of activeOperationalMembers) {
      const profileName = member.function_profile_name?.trim();
      if (!profileName) {
        continue;
      }
      map.set(profileName, (map.get(profileName) ?? 0) + 1);
    }
    return map;
  }, [activeOperationalMembers]);
  const taskTypeCoverageById = useMemo(() => {
    const map = new Map<number, { compatibleMembers: number; compatibleGroups: number }>();
    for (const row of matrixRows) {
      const compatibleMembers = activeOperationalMembers.filter((member) => {
        if (!member.function_profile_name) {
          return false;
        }
        return (
          row.allowedProfileNames.length === 0 ||
          row.allowedProfileNames.includes(member.function_profile_name)
        );
      });
      map.set(row.taskType.id, {
        compatibleMembers: compatibleMembers.length,
        compatibleGroups: new Set(compatibleMembers.map((member) => member.group_id)).size,
      });
    }
    return map;
  }, [activeOperationalMembers, matrixRows]);
  const orphanTaskTypes = useMemo(
    () =>
      matrixRows.filter(
        (row) => (taskTypeCoverageById.get(row.taskType.id)?.compatibleMembers ?? 0) === 0
      ),
    [matrixRows, taskTypeCoverageById]
  );
  const orphanFunctionProfiles = useMemo(
    () =>
      functionProfiles.filter(
        (profile) => (activeCoverageCountByProfileName.get(profile.name) ?? 0) === 0
      ),
    [activeCoverageCountByProfileName, functionProfiles]
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
        eyebrow={t("Core de negocio", "Business core")}
        icon="business-core"
        title={t("Taxonomías", "Taxonomy")}
        description={t(
          "Vista cruzada entre Tipos de tarea y Perfiles funcionales para revisar compatibilidad operativa sin abrir una migración dedicada todavía.",
          "Cross view between Task types and Functional profiles to review operational compatibility without opening a dedicated migration yet."
        )}
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={t("Ayuda", "Help")}
              helpText={t(
                "Los perfiles compatibles se editan desde Tipos de tarea. Si un tipo no define perfiles explícitos, Mantenciones lo tratará como compatible con cualquier perfil funcional declarado dentro del grupo responsable.",
                "Compatible profiles are edited from Task types. If a type does not define explicit profiles, Maintenance treats it as compatible with any declared functional profile inside the responsible group."
              )}
            />
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {error ? (
        <ErrorState
          title={t("No se pudo cargar la taxonomía", "Could not load taxonomy")}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {isLoading ? (
        <LoadingBlock label={t("Cargando matriz de taxonomías...", "Loading taxonomy matrix...")} />
      ) : null}

      <div className="business-core-taxonomy-metrics">
        <PanelCard
          title={t("Tipos de tarea activos", "Active task types")}
          subtitle={t("Base preventiva y operativa disponible", "Available preventive and operational base")}
        >
          <div className="business-core-taxonomy-metric">{taskTypes.length}</div>
        </PanelCard>
        <PanelCard
          title={t("Perfiles funcionales activos", "Active function profiles")}
          subtitle={t("Perfiles reutilizables dentro de grupos", "Reusable profiles inside groups")}
        >
          <div className="business-core-taxonomy-metric">{functionProfiles.length}</div>
        </PanelCard>
        <PanelCard
          title={t("Mapeos explícitos", "Explicit mappings")}
          subtitle={t("Tipos con perfiles compatibles definidos", "Types with defined compatible profiles")}
        >
          <div className="business-core-taxonomy-metric">{explicitMappingsCount}</div>
        </PanelCard>
        <PanelCard
          title={t("Cobertura operativa", "Operational coverage")}
          subtitle={t(
            "Miembros activos y vigentes en grupos responsables",
            "Active and current members in responsible groups"
          )}
        >
          <div className="business-core-taxonomy-metric">{activeOperationalMembers.length}</div>
        </PanelCard>
      </div>

      <div className="business-core-taxonomy-alerts">
        <PanelCard
          title={t("Tipos sin cobertura real", "Task types without real coverage")}
          subtitle={t(
            "No tienen miembros activos compatibles en ningún grupo",
            "They have no compatible active members in any group"
          )}
        >
          {orphanTaskTypes.length === 0 ? (
            <div className="alert alert-success mb-0">
              {t(
                "Todos los tipos de tarea tienen alguna cobertura operativa real.",
                "All task types have some real operational coverage."
              )}
            </div>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {orphanTaskTypes.map(({ taskType }) => (
                <AppBadge key={taskType.id} tone="warning">
                  {taskType.name}
                </AppBadge>
              ))}
            </div>
          )}
        </PanelCard>
        <PanelCard
          title={t("Perfiles huérfanos", "Orphan profiles")}
          subtitle={t(
            "Perfiles sin ninguna membresía activa y vigente en grupos",
            "Profiles without any active and current group membership"
          )}
        >
          {orphanFunctionProfiles.length === 0 ? (
            <div className="alert alert-success mb-0">
              {t(
                "Todos los perfiles tienen presencia operativa en grupos.",
                "All profiles have operational presence in groups."
              )}
            </div>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {orphanFunctionProfiles.map((profile) => (
                <AppBadge key={profile.id} tone="warning">
                  {profile.name}
                </AppBadge>
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      <PanelCard
        title={t("Lectura operativa", "Operational view")}
        subtitle={t(
          "Filtra y revisa rápidamente dónde ya existe compatibilidad fina.",
          "Filter and quickly review where finer compatibility already exists."
        )}
      >
        <div className="row g-3 align-items-end mb-3">
          <div className="col-12 col-lg-8">
            <label className="form-label">{t("Buscar", "Search")}</label>
            <input
              className="form-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                "Filtra por tipo, código, descripción o perfil",
                "Filter by type, code, description, or profile"
              )}
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
                {t(
                  "Mostrar solo tipos con compatibilidad explícita",
                  "Show only types with explicit compatibility"
                )}
              </span>
            </label>
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <div className="alert alert-secondary mb-0">
            {t(
              "No hay combinaciones visibles con los filtros actuales.",
              "There are no visible combinations for the current filters."
            )}
          </div>
        ) : (
          <AppTableWrap>
            <table className="table align-middle business-core-taxonomy-table mb-0">
              <thead>
                <tr>
                  <th className="business-core-taxonomy-table__sticky business-core-taxonomy-table__task-column">
                    {t("Tipo de tarea", "Task type")}
                  </th>
                  {functionProfiles.map((profile) => (
                    <th
                      key={profile.id}
                      className="text-center business-core-taxonomy-table__profile-column"
                    >
                      <div className="business-core-taxonomy-table__profile-title">{profile.name}</div>
                      <div className="business-core-taxonomy-table__profile-code">{profile.code}</div>
                      <div className="business-core-taxonomy-table__profile-coverage">
                        {t("Cobertura", "Coverage")}: {activeCoverageCountByProfileName.get(profile.name) ?? 0}
                      </div>
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
                            {hasExplicitProfiles ? t("explícito", "explicit") : t("flexible", "flexible")}
                          </AppBadge>
                        </div>
                        <div className="business-core-cell__meta">{taskType.code}</div>
                        <div className="business-core-cell__meta">
                          {stripLegacyVisibleText(
                            stripTaskTypeAllowedProfilesMetadata(taskType.description)
                          ) || "—"}
                        </div>
                        <div className="business-core-taxonomy-table__task-coverage mt-1">
                          {t("Miembros compatibles", "Compatible members")}: {taskTypeCoverageById.get(taskType.id)?.compatibleMembers ?? 0}
                          {" · "}
                          {t("Grupos", "Groups")}: {taskTypeCoverageById.get(taskType.id)?.compatibleGroups ?? 0}
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
                              {t("Cualquier perfil declarado", "Any declared profile")}
                            </AppBadge>
                          )}
                        </div>
                      </td>
                      {functionProfiles.map((profile) => {
                        const isCompatible =
                          !hasExplicitProfiles || allowedProfileNames.includes(profile.name);
                        const coverageCount = activeOperationalMembers.filter(
                          (member) => member.function_profile_name === profile.name
                        ).length;
                        return (
                          <td key={`${taskType.id}:${profile.id}`} className="text-center">
                            <span
                              className={`business-core-taxonomy-table__cell-indicator${
                                isCompatible ? " is-compatible" : ""
                              }`}
                              aria-label={
                                isCompatible ? t("Compatible", "Compatible") : t("No compatible", "Not compatible")
                              }
                            >
                              {isCompatible ? "●" : "–"}
                            </span>
                            {isCompatible ? (
                              <div className="business-core-taxonomy-table__cell-meta">{coverageCount}</div>
                            ) : null}
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
