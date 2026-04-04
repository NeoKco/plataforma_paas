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
import { useLanguage } from "../../../../../store/language-context";
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
      language === "es"
        ? `Quitar a "${member.user_full_name || member.user_email || `#${member.tenant_user_id}`}" de este grupo?`
        : `Remove "${member.user_full_name || member.user_email || `#${member.tenant_user_id}`}" from this group?`
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
        eyebrow={language === "es" ? "Core de negocio" : "Business core"}
        icon="users"
        title={language === "es" ? "Miembros del grupo" : "Group members"}
        description={
          workGroup
            ? language === "es"
              ? `Gestiona quién pertenece a ${workGroup.name}, con perfil funcional y flags operativos.`
              : `Manage who belongs to ${workGroup.name}, with functional profile and operational flags.`
            : language === "es"
              ? "Gestiona la membresía real entre usuarios tenant y grupos de trabajo."
              : "Manage the real membership between tenant users and work groups."
        }
        actions={
          <AppToolbar compact>
            <Link className="btn btn-outline-secondary" to="/tenant-portal/business-core/work-groups">
              {language === "es" ? "Volver a grupos" : "Back to groups"}
            </Link>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={startCreate}
              disabled={activeUsers.length === 0}
            >
              {language === "es" ? "Nuevo miembro" : "New member"}
            </button>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar la membresía" : "Could not load membership"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando membresías..." : "Loading memberships..."} />
      ) : null}

      {activeUsers.length === 0 && !isLoading ? (
        <div className="alert alert-warning mb-0">
          {language === "es"
            ? "Antes de asignar miembros a un grupo, deben existir usuarios activos en el tenant."
            : "Active tenant users must exist before assigning group members."}{" "}
          <Link to="/tenant-portal/users">
            {language === "es" ? "Ir a usuarios" : "Go to users"}
          </Link>
        </div>
      ) : null}

      <div className="business-core-detail-grid">
        <PanelCard
          title={language === "es" ? "Resumen del grupo" : "Group summary"}
          subtitle={
            language === "es"
              ? "Lectura rápida del equipo operativo seleccionado."
              : "Quick reading of the selected operational team."
          }
        >
          <div className="business-core-detail-list">
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Grupo" : "Group"}
              </span>
              <span>{workGroup?.name || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Tipo" : "Kind"}
              </span>
              <span>{workGroup?.group_kind || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Miembros activos" : "Active members"}
              </span>
              <span>{members.filter((member) => member.is_active).length}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Descripción" : "Description"}
              </span>
              <span>{stripLegacyVisibleText(workGroup?.description) || "—"}</span>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Criterio operativo" : "Operational rule"}
          subtitle={
            language === "es"
              ? "La membresía sirve para planificar por grupo y luego ejecutar por técnico."
              : "Membership is used to plan by group and then execute by technician."
          }
        >
          <div className="business-core-stack">
            <div className="business-core-cell__meta">
              {language === "es"
                ? "Marca un miembro como principal si ese usuario usa este grupo como base operativa."
                : "Mark a member as primary if that user uses this group as their main operational base."}
            </div>
            <div className="business-core-cell__meta">
              {language === "es"
                ? "Marca líder cuando ese usuario coordina o recibe primero la asignación del grupo."
                : "Mark lead when that user coordinates or receives the group assignment first."}
            </div>
          </div>
        </PanelCard>
      </div>

      <DataTableCard
        title={language === "es" ? "Miembros del grupo" : "Group members"}
        subtitle={
          language === "es"
            ? "Usuarios tenant asociados a este grupo con su perfil funcional operativo."
            : "Tenant users associated with this group and their operational functional profile."
        }
        rows={members}
        columns={[
          {
            key: "user",
            header: language === "es" ? "Usuario" : "User",
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
            header: language === "es" ? "Perfil funcional" : "Functional profile",
            render: (item) => item.function_profile_name || "—",
          },
          {
            key: "flags",
            header: language === "es" ? "Rol en el grupo" : "Group role",
            render: (item) => (
              <div className="business-core-card__actions">
                {item.is_primary ? (
                  <AppBadge tone="info">
                    {language === "es" ? "principal" : "primary"}
                  </AppBadge>
                ) : null}
                {item.is_lead ? (
                  <AppBadge tone="warning">
                    {language === "es" ? "líder" : "lead"}
                  </AppBadge>
                ) : null}
                {!item.is_primary && !item.is_lead ? "—" : null}
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (item) => (
              <AppBadge tone={item.is_active ? "success" : "warning"}>
                {item.is_active
                  ? language === "es"
                    ? "activo"
                    : "active"
                  : language === "es"
                    ? "inactivo"
                    : "inactive"}
              </AppBadge>
            ),
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (item) => (
              <AppToolbar compact>
                <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(item)}>
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(item)}>
                  {language === "es" ? "Eliminar" : "Delete"}
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
                ? language === "es"
                  ? "Editar miembro del grupo"
                  : "Edit group member"
                : language === "es"
                  ? "Nuevo miembro del grupo"
                  : "New group member"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="business-core-form-modal__eyebrow">
              {editingId
                ? language === "es"
                  ? "Edición puntual"
                  : "Targeted edit"
                : language === "es"
                  ? "Alta bajo demanda"
                  : "On-demand creation"}
            </div>
            <PanelCard
              title={
                editingId
                  ? language === "es"
                    ? "Editar miembro"
                    : "Edit member"
                  : language === "es"
                    ? "Nuevo miembro"
                    : "New member"
              }
              subtitle={
                language === "es"
                  ? "Asocia un usuario tenant al grupo y, si aplica, marca su perfil funcional y flags de operación."
                  : "Associate a tenant user to the group and, if applicable, set their functional profile and operation flags."
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
                    <label className="form-label">{language === "es" ? "Usuario" : "User"}</label>
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
                        {language === "es" ? "Selecciona un usuario" : "Select a user"}
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
                      {language === "es" ? "Perfil funcional" : "Functional profile"}
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
                        {language === "es" ? "Sin perfil específico" : "No specific profile"}
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
                          {language === "es" ? "Grupo principal del usuario" : "Primary group for user"}
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
                          {language === "es" ? "Líder del grupo" : "Group lead"}
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
                          {language === "es" ? "Membresía activa" : "Active membership"}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Inicio" : "Start"}</label>
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
                    <label className="form-label">{language === "es" ? "Fin" : "End"}</label>
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
                    <label className="form-label">{language === "es" ? "Notas" : "Notes"}</label>
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
                        {language === "es"
                          ? `Se asignará a ${selectedUser.full_name} (${selectedUser.email}).`
                          : `${selectedUser.full_name} (${selectedUser.email}) will be assigned.`}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="business-core-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setIsFormOpen(false)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={isSubmitting || Number(form.tenant_user_id) <= 0}
                  >
                    {isSubmitting
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : editingId
                        ? language === "es"
                          ? "Guardar cambios"
                          : "Save changes"
                        : language === "es"
                          ? "Crear miembro"
                          : "Create member"}
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
