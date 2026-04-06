import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { getTenantUsers } from "../../../../../services/tenant-api";
import { pickLocalizedText, useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  getTenantBusinessFunctionProfiles,
  type TenantBusinessFunctionProfile,
} from "../services/functionProfilesService";
import {
  createTenantBusinessWorkGroupMember,
  deleteTenantBusinessWorkGroupMember,
  getTenantBusinessWorkGroup,
  getTenantBusinessWorkGroupMembers,
  updateTenantBusinessWorkGroupMember,
  type TenantBusinessWorkGroup,
  type TenantBusinessWorkGroupMember,
  type TenantBusinessWorkGroupMemberWriteRequest,
} from "../services/workGroupsService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

function buildDefaultForm(): TenantBusinessWorkGroupMemberWriteRequest {
  return {
    tenant_user_id: 0,
    function_profile_id: null,
    is_primary: false,
    is_lead: false,
    is_active: true,
    starts_at: null,
    ends_at: null,
    notes: null,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreWorkGroupMembersPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const { workGroupId } = useParams<{ workGroupId: string }>();
  const [workGroup, setWorkGroup] = useState<TenantBusinessWorkGroup | null>(null);
  const [members, setMembers] = useState<TenantBusinessWorkGroupMember[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [functionProfiles, setFunctionProfiles] = useState<TenantBusinessFunctionProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessWorkGroupMemberWriteRequest>(buildDefaultForm());

  const currentWorkGroupId = Number(workGroupId || 0);
  const activeUsers = useMemo(
    () => tenantUsers.filter((user) => user.is_active),
    [tenantUsers]
  );
  const activeProfiles = useMemo(
    () => functionProfiles.filter((profile) => profile.is_active),
    [functionProfiles]
  );
  const selectedUser = useMemo(
    () => activeUsers.find((user) => user.id === Number(form.tenant_user_id)) ?? null,
    [activeUsers, form.tenant_user_id]
  );

  async function loadData() {
    if (!session?.accessToken || !currentWorkGroupId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [groupResponse, membersResponse, usersResponse, profilesResponse] = await Promise.all([
        getTenantBusinessWorkGroup(session.accessToken, currentWorkGroupId),
        getTenantBusinessWorkGroupMembers(session.accessToken, currentWorkGroupId),
        getTenantUsers(session.accessToken),
        getTenantBusinessFunctionProfiles(session.accessToken, { includeInactive: false }),
      ]);
      setWorkGroup(groupResponse.data);
      setMembers(membersResponse.data);
      setTenantUsers(usersResponse.data);
      setFunctionProfiles(profilesResponse.data);
      setForm((current) =>
        current.tenant_user_id
          ? current
          : {
              ...current,
              tenant_user_id: usersResponse.data.find((user) => user.is_active)?.id || 0,
            }
      );
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken, currentWorkGroupId]);

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setIsFormOpen(true);
    setForm({
      ...buildDefaultForm(),
      tenant_user_id: activeUsers[0]?.id || 0,
    });
  }

  function startEdit(member: TenantBusinessWorkGroupMember) {
    setEditingId(member.id);
    setFeedback(null);
    setError(null);
    setIsFormOpen(true);
    setForm({
      tenant_user_id: member.tenant_user_id,
      function_profile_id: member.function_profile_id,
      is_primary: member.is_primary,
      is_lead: member.is_lead,
      is_active: member.is_active,
      starts_at: member.starts_at,
      ends_at: member.ends_at,
      notes: stripLegacyVisibleText(member.notes),
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken || !currentWorkGroupId) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: TenantBusinessWorkGroupMemberWriteRequest = {
        tenant_user_id: Number(form.tenant_user_id),
        function_profile_id: form.function_profile_id ? Number(form.function_profile_id) : null,
        is_primary: form.is_primary,
        is_lead: form.is_lead,
        is_active: form.is_active,
        starts_at: normalizeNullable(form.starts_at),
        ends_at: normalizeNullable(form.ends_at),
        notes: normalizeNullable(stripLegacyVisibleText(form.notes)),
      };
      const response = editingId
        ? await updateTenantBusinessWorkGroupMember(
            session.accessToken,
            currentWorkGroupId,
            editingId,
            payload
          )
        : await createTenantBusinessWorkGroupMember(
            session.accessToken,
            currentWorkGroupId,
            payload
          );
      setFeedback(response.message);
      setIsFormOpen(false);
      setEditingId(null);
      setForm(buildDefaultForm());
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(member: TenantBusinessWorkGroupMember) {
    if (!session?.accessToken || !currentWorkGroupId) {
      return;
    }
    const confirmed = window.confirm(
      t(
        `Quitar a "${member.user_full_name || member.user_email || `#${member.tenant_user_id}`}" de este grupo?`,
        `Remove "${member.user_full_name || member.user_email || `#${member.tenant_user_id}`}" from this group?`
      )
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessWorkGroupMember(
        session.accessToken,
        currentWorkGroupId,
        member.id
      );
      if (editingId === member.id) {
        setIsFormOpen(false);
        setEditingId(null);
        setForm(buildDefaultForm());
      }
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={t("Core de negocio", "Business core")}
        icon="users"
        title={t("Miembros del grupo", "Group members")}
        description={
          workGroup
            ? t(
                `Gestiona quién pertenece a ${workGroup.name}, con perfil funcional y flags operativos.`,
                `Manage who belongs to ${workGroup.name}, with functional profile and operational flags.`
              )
            : t(
                "Gestiona la membresía real entre usuarios tenant y grupos de trabajo.",
                "Manage the real membership between tenant users and work groups."
              )
        }
        actions={
          <AppToolbar compact>
            <Link className="btn btn-outline-secondary" to="/tenant-portal/business-core/work-groups">
              {t("Volver a grupos", "Back to groups")}
            </Link>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {t("Recargar", "Reload")}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={startCreate}
              disabled={activeUsers.length === 0}
            >
              {t("Nuevo miembro", "New member")}
            </button>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={t("No se pudo cargar la membresía", "Could not load membership")}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={t("Cargando membresías...", "Loading memberships...")} />
      ) : null}

      {activeUsers.length === 0 && !isLoading ? (
        <div className="alert alert-warning mb-0">
          {t(
            "Antes de asignar miembros a un grupo, deben existir usuarios activos en el tenant.",
            "Active tenant users must exist before assigning group members."
          )}{" "}
          <Link to="/tenant-portal/users">
            {t("Ir a usuarios", "Go to users")}
          </Link>
        </div>
      ) : null}

      <div className="business-core-detail-grid">
        <PanelCard
          title={t("Resumen del grupo", "Group summary")}
          subtitle={
            t(
              "Lectura rápida del equipo operativo seleccionado.",
              "Quick reading of the selected operational team."
            )
          }
        >
          <div className="business-core-detail-list">
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {t("Grupo", "Group")}
              </span>
              <span>{workGroup?.name || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {t("Tipo", "Kind")}
              </span>
              <span>{workGroup?.group_kind || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {t("Miembros activos", "Active members")}
              </span>
              <span>{members.filter((member) => member.is_active).length}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {t("Descripción", "Description")}
              </span>
              <span>{stripLegacyVisibleText(workGroup?.description) || "—"}</span>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          title={t("Criterio operativo", "Operational rule")}
          subtitle={
            t(
              "La membresía sirve para planificar por grupo y luego ejecutar por técnico.",
              "Membership is used to plan by group and then execute by technician."
            )
          }
        >
          <div className="business-core-stack">
            <div className="business-core-cell__meta">
              {t(
                "Marca un miembro como principal si ese usuario usa este grupo como base operativa.",
                "Mark a member as primary if that user uses this group as their main operational base."
              )}
            </div>
            <div className="business-core-cell__meta">
              {t(
                "Marca líder cuando ese usuario coordina o recibe primero la asignación del grupo.",
                "Mark lead when that user coordinates or receives the group assignment first."
              )}
            </div>
          </div>
        </PanelCard>
      </div>

      <DataTableCard
        title={t("Miembros del grupo", "Group members")}
        subtitle={
          t(
            "Usuarios tenant asociados a este grupo con su perfil funcional operativo.",
            "Tenant users associated with this group and their operational functional profile."
          )
        }
        rows={members}
        columns={[
          {
            key: "user",
            header: t("Usuario", "User"),
            render: (item) => (
              <div>
                <div className="business-core-cell__title">
                  {item.user_full_name || `#${item.tenant_user_id}`}
                </div>
                <div className="business-core-cell__meta">
                  {item.user_email || "—"}
                </div>
              </div>
            ),
          },
          {
            key: "profile",
            header: t("Perfil funcional", "Functional profile"),
            render: (item) => item.function_profile_name || "—",
          },
          {
            key: "flags",
            header: t("Rol en el grupo", "Group role"),
            render: (item) => (
              <div className="business-core-card__actions">
                {item.is_primary ? (
                  <AppBadge tone="info">
                    {t("principal", "primary")}
                  </AppBadge>
                ) : null}
                {item.is_lead ? (
                  <AppBadge tone="warning">
                    {t("líder", "lead")}
                  </AppBadge>
                ) : null}
                {!item.is_primary && !item.is_lead ? "—" : null}
              </div>
            ),
          },
          {
            key: "status",
            header: t("Estado", "Status"),
            render: (item) => (
              <AppBadge tone={item.is_active ? "success" : "warning"}>
                {item.is_active ? t("activo", "active") : t("inactivo", "inactive")}
              </AppBadge>
            ),
          },
          {
            key: "actions",
            header: t("Acciones", "Actions"),
            render: (item) => (
              <AppToolbar compact>
                <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(item)}>
                  {t("Editar", "Edit")}
                </button>
                <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(item)}>
                  {t("Eliminar", "Delete")}
                </button>
              </AppToolbar>
            ),
          },
        ]}
      />

      {isFormOpen ? (
        <div className="business-core-form-backdrop" role="presentation" onClick={() => setIsFormOpen(false)}>
          <div
            className="business-core-form-modal business-core-form-modal--catalog"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId
                ? t("Editar miembro del grupo", "Edit group member")
                : t("Nuevo miembro del grupo", "New group member")
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="business-core-form-modal__eyebrow">
              {editingId ? t("Edición puntual", "Targeted edit") : t("Alta bajo demanda", "On-demand creation")}
            </div>
            <PanelCard
              title={
                editingId ? t("Editar miembro", "Edit member") : t("Nuevo miembro", "New member")
              }
              subtitle={
                t(
                  "Asocia un usuario tenant al grupo y, si aplica, marca su perfil funcional y flags de operación.",
                  "Associate a tenant user to the group and, if applicable, set their functional profile and operation flags."
                )
              }
            >
              <form
                className="business-core-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">{t("Usuario", "User")}</label>
                    <select
                      className="form-select"
                      value={form.tenant_user_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          tenant_user_id: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>
                        {t("Selecciona un usuario", "Select a user")}
                      </option>
                      {activeUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} · {user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {t("Perfil funcional", "Functional profile")}
                    </label>
                    <select
                      className="form-select"
                      value={form.function_profile_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          function_profile_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">
                        {t("Sin perfil específico", "No specific profile")}
                      </option>
                      {activeProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <div className="business-core-card__actions">
                      <label className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={form.is_primary}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              is_primary: event.target.checked,
                            }))
                          }
                        />
                        <span className="form-check-label">
                          {t("Grupo principal del usuario", "Primary group for user")}
                        </span>
                      </label>
                      <label className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={form.is_lead}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              is_lead: event.target.checked,
                            }))
                          }
                        />
                        <span className="form-check-label">
                          {t("Líder del grupo", "Group lead")}
                        </span>
                      </label>
                      <label className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              is_active: event.target.checked,
                            }))
                          }
                        />
                        <span className="form-check-label">
                          {t("Membresía activa", "Active membership")}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{t("Inicio", "Start")}</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={form.starts_at ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          starts_at: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{t("Fin", "End")}</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={form.ends_at ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          ends_at: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{t("Notas", "Notes")}</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.notes ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </div>
                  {selectedUser ? (
                    <div className="col-12">
                      <div className="business-core-cell__meta">
                        {t(
                          `Se asignará a ${selectedUser.full_name} (${selectedUser.email}).`,
                          `${selectedUser.full_name} (${selectedUser.email}) will be assigned.`
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="business-core-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setIsFormOpen(false)}>
                    {t("Cancelar", "Cancel")}
                  </button>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={isSubmitting || Number(form.tenant_user_id) <= 0}
                  >
                    {isSubmitting
                      ? t("Guardando...", "Saving...")
                      : editingId
                        ? t("Guardar cambios", "Save changes")
                        : t("Crear miembro", "Create member")}
                  </button>
                </div>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
