import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ConfirmDialog } from "../../../../components/common/ConfirmDialog";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import {
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../design-system/AppForm";
import { AppToolbar } from "../../../../design-system/AppLayout";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  createPlatformUser,
  deletePlatformUser,
  listPlatformUsers,
  resetPlatformUserPassword,
  updatePlatformUser,
  updatePlatformUserStatus,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import { useLanguage } from "../../../../store/language-context";
import {
  getPlatformActionFeedbackLabel,
  getPlatformActionSuccessMessage,
} from "../../../../utils/action-feedback";
import { getCurrentLocale } from "../../../../utils/i18n";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import type { ApiError, PlatformUser } from "../../../../types";
import {
  canCreatePlatformUserRole,
  canManagePlatformUser,
  getEditablePlatformUserRoles,
  normalizePlatformAdminRole,
} from "../../access/platformRoleAccess";

type ActionFeedback = {
  scope: string;
  type: "success" | "error";
  message: string;
};

const PLATFORM_ROLE_OPTIONS = ["superadmin", "admin", "support"];

function formatPlatformUserErrorMessage(
  detail: string,
  language: "es" | "en"
): string {
  switch (detail) {
    case "Only one active superadmin is allowed":
      return language === "es"
        ? "No puedes asignar otro superadministrador activo porque la plataforma debe operar con un solo superadministrador activo."
        : "You cannot assign another active superadmin because the platform must operate with a single active superadmin.";
    case "Superadmin role cannot be assigned from this flow":
      return language === "es"
        ? "La cuenta superadministradora no se crea ni se asigna desde este flujo. Debe mantenerse como cuenta raíz única de la plataforma."
        : "The superadmin account is not created or assigned from this flow. It must remain as the platform unique root account.";
    case "At least one active superadmin must remain":
      return language === "es"
        ? "No puedes dejar la plataforma sin un superadministrador activo."
        : "You cannot leave the platform without an active superadmin.";
    case "Superadmin users cannot be deleted":
      return language === "es"
        ? "La cuenta superadministradora no se elimina desde la consola. Si necesitas normalizar una cuenta heredada, primero degrádala o desactívala con una cuenta superadministradora distinta activa."
        : "The superadmin account cannot be deleted from this console. If you need to normalize a legacy account, first downgrade or deactivate it while another superadmin account is active.";
    case "Platform users cannot delete themselves":
      return language === "es"
        ? "No puedes eliminar tu propia cuenta desde esta consola."
        : "You cannot delete your own account from this console.";
    case "You do not have permission to create this platform user role":
      return language === "es"
        ? "Tu rol actual no puede crear ese tipo de usuario de plataforma."
        : "Your current role cannot create that platform user type.";
    case "You do not have permission to manage this platform user":
      return language === "es"
        ? "Tu rol actual no puede gestionar este usuario de plataforma."
        : "Your current role cannot manage this platform user.";
    default:
      return detail;
  }
}

export function PlatformUsersPage() {
  const { session } = useAuth();
  const { language } = useLanguage();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogRoleFilter, setCatalogRoleFilter] = useState("");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState("");

  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState("support");
  const [createPassword, setCreatePassword] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);

  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("support");
  const [resetPassword, setResetPassword] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PlatformUser | null>(null);

  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const currentPlatformRole = normalizePlatformAdminRole(session?.role);

  const filteredUsers = useMemo(() => {
    const search = catalogSearch.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.full_name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search);
      const matchesRole = !catalogRoleFilter || user.role === catalogRoleFilter;
      const matchesStatus =
        !catalogStatusFilter ||
        (catalogStatusFilter === "active" ? user.is_active : !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [catalogRoleFilter, catalogSearch, catalogStatusFilter, users]);

  const overview = useMemo(() => {
    const activeUsers = users.filter((user) => user.is_active).length;
    const activeSuperadmins = users.filter(
      (user) => user.role === "superadmin" && user.is_active
    ).length;
    return {
      totalUsers: users.length,
      activeUsers,
      inactiveUsers: users.length - activeUsers,
      activeSuperadmins,
    };
  }, [users]);

  const hasActiveSuperadmin = overview.activeSuperadmins > 0;
  const hasMultipleActiveSuperadmins = overview.activeSuperadmins > 1;
  const currentUserId =
    users.find((user) => user.email === session?.email)?.id ?? null;

  function canCreateRole(role: string): boolean {
    return canCreatePlatformUserRole(currentPlatformRole, role);
  }

  function canManageSelectedUser(user: PlatformUser | null): boolean {
    return canManagePlatformUser(currentPlatformRole, user?.role);
  }

  function getEditableRoleOptions(user: PlatformUser | null): string[] {
    return getEditablePlatformUserRoles(currentPlatformRole, user?.role);
  }

  const creatableRoles = PLATFORM_ROLE_OPTIONS.filter(canCreateRole);
  const editableRoleOptions = getEditableRoleOptions(selectedUser);
  const canEditSelectedUser = Boolean(selectedUser) && editableRoleOptions.length > 0;
  const canToggleSelectedUser = canManageSelectedUser(selectedUser);
  const canResetSelectedUserPassword =
    Boolean(selectedUser) &&
    canManagePlatformUser(currentPlatformRole, selectedUser?.role);
  const canDeleteSelectedUser =
    Boolean(selectedUser) &&
    selectedUser?.role !== "superadmin" &&
    canManageSelectedUser(selectedUser) &&
    selectedUser?.id !== currentUserId;

  useEffect(() => {
    if (!selectedUser) {
      setEditFullName("");
      setEditRole("support");
      setResetPassword("");
      return;
    }

    setEditFullName(selectedUser.full_name);
    setEditRole(selectedUser.role);
    setResetPassword("");
  }, [selectedUser]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void loadUsers();
  }, [session?.accessToken]);

  async function loadUsers() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await listPlatformUsers(session.accessToken);
      setUsers(response.data);
      setSelectedUserId((current) => {
        if (response.data.length === 0) {
          return null;
        }
        if (current && response.data.some((user) => user.id === current)) {
          return current;
        }
        return response.data[0].id;
      });
    } catch (rawError) {
      setError(rawError as ApiError);
      setUsers([]);
      setSelectedUserId(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const response = await createPlatformUser(session.accessToken, {
        full_name: createFullName,
        email: createEmail,
        role: createRole,
        password: createPassword,
        is_active: createIsActive,
      });
      await loadUsers();
      setSelectedUserId(response.user_id);
      setCreateFullName("");
      setCreateEmail("");
      setCreateRole("support");
      setCreatePassword("");
      setCreateIsActive(true);
      setActionFeedback({
        scope: "create-platform-user",
        type: "success",
        message: getPlatformActionSuccessMessage(
          "create-platform-user",
          response.message,
          language
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "create-platform-user",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message,
          language
        ),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleUpdateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !selectedUser) {
      return;
    }

    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const response = await updatePlatformUser(session.accessToken, selectedUser.id, {
        full_name: editFullName,
        role: editRole,
      });
      await loadUsers();
      setActionFeedback({
        scope: "identity-platform-user",
        type: "success",
        message: getPlatformActionSuccessMessage(
          "identity-platform-user",
          response.message,
          language
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "identity-platform-user",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message,
          language
        ),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleToggleStatus() {
    if (!session?.accessToken || !selectedUser) {
      return;
    }

    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const response = await updatePlatformUserStatus(
        session.accessToken,
        selectedUser.id,
        { is_active: !selectedUser.is_active }
      );
      await loadUsers();
      setActionFeedback({
        scope: "status-platform-user",
        type: "success",
        message: getPlatformActionSuccessMessage(
          "status-platform-user",
          response.message,
          language
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "status-platform-user",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message,
          language
        ),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !selectedUser) {
      return;
    }

    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const response = await resetPlatformUserPassword(
        session.accessToken,
        selectedUser.id,
        { new_password: resetPassword }
      );
      setResetPassword("");
      setActionFeedback({
        scope: "reset-platform-user-password",
        type: "success",
        message: getPlatformActionSuccessMessage(
          "reset-platform-user-password",
          response.message,
          language
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "reset-platform-user-password",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message,
          language
        ),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleDeleteUser() {
    if (!session?.accessToken || !deleteCandidate) {
      return;
    }

    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const response = await deletePlatformUser(session.accessToken, deleteCandidate.id);
      setDeleteCandidate(null);
      await loadUsers();
      setActionFeedback({
        scope: "delete-platform-user",
        type: "success",
        message: getPlatformActionSuccessMessage(
          "delete-platform-user",
          response.message,
          language
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "delete-platform-user",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message,
          language
        ),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Plataforma" : "Platform"}
        icon="users"
        title={language === "es" ? "Usuarios de plataforma" : "Platform users"}
        description={
          language === "es"
            ? "Gobierna quién puede entrar a la consola central, con qué rol y con qué estado operativo."
            : "Manage who can enter the central console, with which role and with which operational status."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadUsers()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando usuarios de plataforma..."
              : "Loading platform users..."
          }
        />
      ) : null}
      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "Falló el catálogo de usuarios de plataforma"
              : "Platform users catalog failed"
          }
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {!isLoading ? (
        <>
          <div className="dashboard-overview-grid">
            <MetricCard
              label={language === "es" ? "Usuarios totales" : "Total users"}
              icon="users"
              tone="default"
              value={overview.totalUsers}
            />
            <MetricCard
              label={language === "es" ? "Usuarios activos" : "Active users"}
              icon="overview"
              tone="success"
              value={overview.activeUsers}
            />
            <MetricCard
              label={language === "es" ? "Usuarios inactivos" : "Inactive users"}
              icon="settings"
              tone="warning"
              value={overview.inactiveUsers}
            />
            <MetricCard
              label={language === "es" ? "Superadministradores activos" : "Active superadmins"}
              icon="dashboard"
              tone="info"
              value={overview.activeSuperadmins}
              hint={
                language === "es"
                  ? "La política actual recomienda y ahora exige operar con uno solo activo."
                  : "Current policy recommends and now requires operating with only one active superadmin."
              }
            />
          </div>

          {hasMultipleActiveSuperadmins ? (
            <div className="tenant-action-feedback tenant-action-feedback--error">
              <strong>
                {language === "es" ? "Política de superadministración:" : "Superadmin policy:"}
              </strong>{" "}
              {language === "es"
                ? "Hoy existen varios superadministradores activos por datos heredados. Desde ahora ya no se pueden crear ni promover más. Conviene dejar solo uno activo y degradar o desactivar el resto."
                : "There are currently multiple active superadmins due to legacy data. New ones can no longer be created or promoted. It is recommended to keep only one active and downgrade or disable the rest."}
            </div>
          ) : null}

          <div className="settings-grid">
            <PanelCard
              icon="users"
              title={
                language === "es"
                  ? "Alta de usuario de plataforma"
                  : "Create platform user"
              }
              subtitle={
                language === "es"
                  ? "Crea otro operador para la consola central con una contraseña inicial controlada."
                  : "Create another operator for the central console with a controlled initial password."
              }
            >
              {creatableRoles.length === 0 ? (
                <p className="tenant-help-text">
                  {language === "es"
                    ? "Tu rol actual es de solo lectura para este bloque. Solo `superadmin` y `admin` pueden crear usuarios de plataforma."
                    : "Your current role is read-only for this block. Only `superadmin` and `admin` can create platform users."}
                </p>
              ) : (
                <AppForm onSubmit={handleCreateUser}>
                  <AppFormField label={language === "es" ? "Nombre completo" : "Full name"}>
                  <input
                    className="form-control"
                    value={createFullName}
                    onChange={(event) => setCreateFullName(event.target.value)}
                    placeholder={language === "es" ? "Nombre completo" : "Full name"}
                  />
                  </AppFormField>
                  <AppFormField label={language === "es" ? "Correo de acceso" : "Access email"}>
                  <input
                    className="form-control"
                    type="email"
                    value={createEmail}
                    onChange={(event) => setCreateEmail(event.target.value)}
                    placeholder={language === "es" ? "Correo de acceso" : "Access email"}
                  />
                  </AppFormField>
                  <AppFormField label={language === "es" ? "Rol" : "Role"}>
                    <select
                      className="form-select"
                      value={createRole}
                      onChange={(event) => setCreateRole(event.target.value)}
                    >
                      {creatableRoles.map((role) => (
                        <option key={role} value={role}>
                          {displayPlatformCode(role, language)}
                        </option>
                        ))}
                      </select>
                  </AppFormField>
                  <AppFormField label={language === "es" ? "Estado inicial" : "Initial status"}>
                    <select
                      className="form-select"
                      value={createIsActive ? "active" : "inactive"}
                      onChange={(event) =>
                        setCreateIsActive(event.target.value === "active")
                      }
                    >
                      <option value="active">{displayPlatformCode("active", language)}</option>
                      <option value="inactive">{displayPlatformCode("inactive", language)}</option>
                    </select>
                  </AppFormField>
                  <AppFormField label={language === "es" ? "Contraseña inicial" : "Initial password"}>
                  <input
                    className="form-control"
                    type="password"
                    value={createPassword}
                    onChange={(event) => setCreatePassword(event.target.value)}
                    placeholder={language === "es" ? "Contraseña inicial" : "Initial password"}
                  />
                  </AppFormField>
                  <AppFormField fullWidth>
                  <p className="tenant-help-text">
                    {currentPlatformRole === "superadmin"
                      ? language === "es"
                        ? "Usa `admin` para gestión operativa de usuarios y `support` para apoyo diario. `superadmin` queda reservado como cuenta raíz única y no se crea desde este flujo."
                        : "Use `admin` for operational user management and `support` for daily assistance. `superadmin` remains reserved as the unique root account and is not created from this flow."
                      : language === "es"
                        ? "Como administrador, desde aquí solo puedes crear usuarios `support`."
                        : "As an admin, from here you can only create `support` users."}
                  </p>
                  </AppFormField>
                  <AppFormActions>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={
                      isActionSubmitting ||
                      !createFullName.trim() ||
                      !createEmail.trim() ||
                      !createPassword.trim()
                    }
                  >
                    {language === "es" ? "Crear usuario" : "Create user"}
                  </button>
                  </AppFormActions>
                </AppForm>
              )}
            </PanelCard>

            <PanelCard
              icon="catalogs"
              title={
                language === "es"
                  ? "Catálogo de usuarios de plataforma"
                  : "Platform users catalog"
              }
              subtitle={
                language === "es"
                  ? "Busca, filtra y selecciona operadores para revisar su acceso."
                  : "Search, filter and select operators to review their access."
              }
            >
              <div className="tenant-catalog-filters">
                <input
                  className="form-control"
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  placeholder={
                    language === "es"
                      ? "Buscar por nombre, correo o rol"
                      : "Search by name, email or role"
                  }
                />
                <div className="tenant-inline-form-grid">
                  <select
                    className="form-select"
                    value={catalogRoleFilter}
                    onChange={(event) => setCatalogRoleFilter(event.target.value)}
                  >
                    <option value="">{language === "es" ? "Todos los roles" : "All roles"}</option>
                    {PLATFORM_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {displayPlatformCode(role, language)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="form-select"
                    value={catalogStatusFilter}
                    onChange={(event) => setCatalogStatusFilter(event.target.value)}
                  >
                    <option value="">{language === "es" ? "Todos los estados" : "All statuses"}</option>
                    <option value="active">{language === "es" ? "activos" : "active"}</option>
                    <option value="inactive">{language === "es" ? "inactivos" : "inactive"}</option>
                  </select>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="text-secondary">
                  {language === "es"
                    ? "Aún no hay usuarios de plataforma creados además del operador inicial."
                    : "There are no platform users yet beyond the initial operator."}
                </div>
              ) : null}

              {users.length > 0 && filteredUsers.length === 0 ? (
                <div className="text-secondary">
                  {language === "es"
                    ? "No hay usuarios de plataforma que coincidan con los filtros actuales."
                    : "No platform users match the current filters."}
                </div>
              ) : null}

              {filteredUsers.length > 0 ? (
                <>
                  <div className="tenant-catalog-summary">
                    {filteredUsers.length}{" "}
                    {language === "es" ? "de" : "of"} {users.length}{" "}
                    {language === "es" ? "usuarios visibles" : "visible users"}
                  </div>
                  <div className="tenant-list">
                    {filteredUsers.map((user) => {
                      const isSelected = user.id === selectedUserId;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          className={`tenant-list__item${isSelected ? " is-selected" : ""}`}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <div className="tenant-list__row">
                            <div>
                              <div className="tenant-list__title">{user.full_name}</div>
                              <div className="tenant-list__meta">
                                <code>{user.email}</code>
                                <span>{displayPlatformCode(user.role, language)}</span>
                              </div>
                            </div>
                            <StatusBadge value={user.is_active ? "active" : "inactive"} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </PanelCard>
          </div>

          {actionFeedback ? (
            <div
              className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
            >
              <strong>{getPlatformActionFeedbackLabel(actionFeedback.scope, language)}:</strong>{" "}
              {actionFeedback.message}
            </div>
          ) : null}

          {selectedUser ? (
            <div className="tenant-action-grid">
              <PanelCard
                icon="users"
                title={selectedUser.full_name}
                subtitle={
                  language === "es"
                    ? "Identidad básica y rol operativo del usuario de plataforma seleccionado."
                    : "Basic identity and operational role of the selected platform user."
                }
              >
                <div className="tenant-detail-grid mb-4">
                  <DetailField label="Email" value={selectedUser.email} />
                  <DetailField
                    label={language === "es" ? "Rol" : "Role"}
                    value={displayPlatformCode(selectedUser.role, language)}
                  />
                  <DetailField
                    label={language === "es" ? "Estado" : "Status"}
                    value={<StatusBadge value={selectedUser.is_active ? "active" : "inactive"} />}
                  />
                  <DetailField
                    label={language === "es" ? "Creado" : "Created"}
                    value={formatDateTime(selectedUser.created_at, language)}
                  />
                </div>

                <AppForm onSubmit={handleUpdateUser}>
                  <AppFormField label={language === "es" ? "Nombre completo" : "Full name"}>
                  <input
                    className="form-control"
                    value={editFullName}
                    onChange={(event) => setEditFullName(event.target.value)}
                    placeholder={language === "es" ? "Nombre completo" : "Full name"}
                    disabled={!canEditSelectedUser || isActionSubmitting}
                  />
                  </AppFormField>
                  <AppFormField label={language === "es" ? "Rol" : "Role"}>
                  <select
                    className="form-select"
                    value={editRole}
                    onChange={(event) => setEditRole(event.target.value)}
                    disabled={!canEditSelectedUser || isActionSubmitting}
                  >
                    {editableRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {displayPlatformCode(role, language)}
                      </option>
                      ))}
                    </select>
                  </AppFormField>
                  {!canEditSelectedUser ? (
                    <AppFormField fullWidth>
                      <p className="tenant-help-text">
                      {selectedUser.role === "superadmin"
                        ? language === "es"
                          ? "La cuenta superadministradora no se crea ni se elimina desde aquí. Si existen superadministradores heredados, solo un superadministrador puede degradarlos o desactivarlos manteniendo siempre uno activo."
                          : "The superadmin account is not created or deleted from here. If there are legacy superadmins, only another superadmin can downgrade or disable them while keeping one active."
                        : language === "es"
                          ? "Tu rol actual no puede editar la identidad o el rol de este usuario."
                          : "Your current role cannot edit this user's identity or role."}
                      </p>
                    </AppFormField>
                  ) : null}
                  <AppFormActions>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={
                      isActionSubmitting ||
                      !canEditSelectedUser ||
                      !editFullName.trim()
                    }
                  >
                    {language === "es" ? "Guardar identidad" : "Save identity"}
                  </button>
                  </AppFormActions>
                </AppForm>
              </PanelCard>

              <div className="d-grid gap-4">
                <PanelCard
                  icon="settings"
                  title={language === "es" ? "Estado operativo" : "Operational status"}
                  subtitle={
                    language === "es"
                      ? "Activa o desactiva el acceso de este usuario a la consola de plataforma."
                      : "Enable or disable this user's access to the platform console."
                  }
                >
                  <p className="tenant-help-text">
                    {language === "es"
                      ? "Si este usuario es el último superadministrador activo, el backend bloqueará la desactivación o el cambio de rol. Si ya existe otro superadministrador activo, tampoco podrás habilitar uno nuevo."
                      : "If this user is the last active superadmin, the backend will block deactivation or role change. If another active superadmin already exists, you also cannot enable a new one."}
                  </p>
                  <button
                    className="btn btn-outline-primary mt-3"
                    type="button"
                    onClick={() => void handleToggleStatus()}
                    disabled={isActionSubmitting || !canToggleSelectedUser}
                  >
                    {selectedUser.is_active
                      ? language === "es"
                        ? "Desactivar acceso"
                        : "Disable access"
                      : language === "es"
                        ? "Activar acceso"
                        : "Enable access"}
                  </button>
                </PanelCard>

                <PanelCard
                  icon="settings"
                  title={language === "es" ? "Contraseña inicial" : "Password reset"}
                  subtitle={
                    language === "es"
                      ? "Reemplaza la contraseña actual por una nueva clave controlada desde plataforma."
                      : "Replace the current password with a new controlled password from the platform."
                  }
                >
                  <AppForm onSubmit={handleResetPassword}>
                    <AppFormField label={language === "es" ? "Nueva contraseña" : "New password"}>
                    <input
                      className="form-control"
                      type="password"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      placeholder={language === "es" ? "Nueva contraseña" : "New password"}
                      disabled={!canResetSelectedUserPassword || isActionSubmitting}
                    />
                    </AppFormField>
                    <AppFormActions>
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={
                        isActionSubmitting ||
                        !canResetSelectedUserPassword ||
                        !resetPassword.trim()
                      }
                    >
                      {language === "es" ? "Actualizar contraseña" : "Update password"}
                    </button>
                    </AppFormActions>
                  </AppForm>
                </PanelCard>

                <PanelCard
                  icon="activity"
                  title={language === "es" ? "Eliminar usuario" : "Delete user"}
                  subtitle={
                    language === "es"
                      ? "Borra de forma definitiva cuentas no críticas de plataforma."
                      : "Permanently remove non-critical platform accounts."
                  }
                >
                  <p className="tenant-help-text">
                    {language === "es"
                      ? "No se elimina la cuenta `superadmin` y tampoco puedes borrar tu propia cuenta desde esta consola."
                      : "The `superadmin` account cannot be deleted and you cannot delete your own account from this console."}
                  </p>
                  <button
                    className="btn btn-outline-danger mt-3"
                    type="button"
                    onClick={() => setDeleteCandidate(selectedUser)}
                    disabled={isActionSubmitting || !canDeleteSelectedUser}
                  >
                    {language === "es" ? "Eliminar usuario" : "Delete user"}
                  </button>
                </PanelCard>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title={language === "es" ? "Eliminar usuario de plataforma" : "Delete platform user"}
        description={
          deleteCandidate
            ? language === "es"
              ? `Se eliminará de forma definitiva a ${deleteCandidate.full_name} (${deleteCandidate.email}).`
              : `${deleteCandidate.full_name} (${deleteCandidate.email}) will be permanently deleted.`
            : ""
        }
        confirmLabel={language === "es" ? "Eliminar usuario" : "Delete user"}
        cancelLabel={language === "es" ? "Cancelar" : "Cancel"}
        tone="danger"
        onConfirm={() => void handleDeleteUser()}
        onCancel={() => setDeleteCandidate(null)}
      />
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="tenant-detail__label">{label}</div>
      <div className="tenant-detail__value">{value}</div>
    </div>
  );
}

function formatDateTime(value: string | null, language: "es" | "en"): string {
  if (!value) {
    return "n/a";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(getCurrentLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
