import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ConfirmDialog } from "../../../../components/common/ConfirmDialog";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
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
import {
  getPlatformActionFeedbackLabel,
  getPlatformActionSuccessMessage,
} from "../../../../utils/action-feedback";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import type { ApiError, PlatformUser } from "../../../../types";

type ActionFeedback = {
  scope: string;
  type: "success" | "error";
  message: string;
};

const PLATFORM_ROLE_OPTIONS = ["superadmin", "admin", "support"];

function formatPlatformUserErrorMessage(detail: string): string {
  switch (detail) {
    case "Only one active superadmin is allowed":
      return "No puedes asignar otro superadministrador activo porque la plataforma debe operar con un solo superadministrador activo.";
    case "Superadmin role cannot be assigned from this flow":
      return "La cuenta superadministradora no se crea ni se asigna desde este flujo. Debe mantenerse como cuenta raíz única de la plataforma.";
    case "At least one active superadmin must remain":
      return "No puedes dejar la plataforma sin un superadministrador activo.";
    case "Superadmin users cannot be deleted":
      return "La cuenta superadministradora no se elimina desde la consola. Si necesitas normalizar una cuenta heredada, primero degrádala o desactívala con una cuenta superadministradora distinta activa.";
    case "Platform users cannot delete themselves":
      return "No puedes eliminar tu propia cuenta desde esta consola.";
    case "You do not have permission to create this platform user role":
      return "Tu rol actual no puede crear ese tipo de usuario de plataforma.";
    case "You do not have permission to manage this platform user":
      return "Tu rol actual no puede gestionar este usuario de plataforma.";
    default:
      return detail;
  }
}

export function PlatformUsersPage() {
  const { session } = useAuth();
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
  const currentPlatformRole = session?.role || "support";

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
    if (currentPlatformRole === "superadmin") {
      return role === "admin" || role === "support";
    }
    if (currentPlatformRole === "admin") {
      return role === "support";
    }
    return false;
  }

  function canManageSelectedUser(user: PlatformUser | null): boolean {
    if (!user) {
      return false;
    }
    if (currentPlatformRole === "superadmin") {
      return true;
    }
    if (currentPlatformRole === "admin") {
      return user.role === "support";
    }
    return false;
  }

  function getEditableRoleOptions(user: PlatformUser | null): string[] {
    if (!user) {
      return [];
    }
    if (currentPlatformRole === "superadmin") {
      return user.role === "superadmin"
        ? ["superadmin", "admin", "support"]
        : ["admin", "support"];
    }
    if (currentPlatformRole === "admin" && user.role === "support") {
      return ["support"];
    }
    return [];
  }

  const creatableRoles = PLATFORM_ROLE_OPTIONS.filter(canCreateRole);
  const editableRoleOptions = getEditableRoleOptions(selectedUser);
  const canEditSelectedUser = Boolean(selectedUser) && editableRoleOptions.length > 0;
  const canToggleSelectedUser = canManageSelectedUser(selectedUser);
  const canResetSelectedUserPassword =
    Boolean(selectedUser) &&
    (currentPlatformRole === "superadmin" ||
      (currentPlatformRole === "admin" && selectedUser?.role === "support"));
  const canDeleteSelectedUser =
    Boolean(selectedUser) &&
    selectedUser.role !== "superadmin" &&
    canManageSelectedUser(selectedUser) &&
    selectedUser.id !== currentUserId;

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
          response.message
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "create-platform-user",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message
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
          response.message
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "identity-platform-user",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message
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
          response.message
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "status-platform-user",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message
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
          response.message
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "reset-platform-user-password",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message
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
          response.message
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "delete-platform-user",
        type: "error",
        message: formatPlatformUserErrorMessage(
          typedError.payload?.detail || typedError.message
        ),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Plataforma"
        title="Usuarios de plataforma"
        description="Gobierna quién puede entrar a la consola central, con qué rol y con qué estado operativo."
      />

      {isLoading ? <LoadingBlock label="Cargando usuarios de plataforma..." /> : null}
      {error ? (
        <ErrorState
          title="Falló el catálogo de usuarios de plataforma"
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {!isLoading ? (
        <>
          <div className="dashboard-overview-grid">
            <MetricCard label="Usuarios totales" value={overview.totalUsers} />
            <MetricCard label="Usuarios activos" value={overview.activeUsers} />
            <MetricCard label="Usuarios inactivos" value={overview.inactiveUsers} />
            <MetricCard
              label="Superadministradores activos"
              value={overview.activeSuperadmins}
              hint="La política actual recomienda y ahora exige operar con uno solo activo."
            />
          </div>

          {hasMultipleActiveSuperadmins ? (
            <div className="tenant-action-feedback tenant-action-feedback--error">
              <strong>Política de superadministración:</strong> Hoy existen varios
              superadministradores activos por datos heredados. Desde ahora ya no
              se pueden crear ni promover más. Conviene dejar solo uno activo y
              degradar o desactivar el resto.
            </div>
          ) : null}

          <div className="settings-grid">
            <PanelCard
              title="Alta de usuario de plataforma"
              subtitle="Crea otro operador para la consola central con una contraseña inicial controlada."
            >
              {creatableRoles.length === 0 ? (
                <p className="tenant-help-text">
                  Tu rol actual es de solo lectura para este bloque. Solo `superadmin`
                  y `admin` pueden crear usuarios de plataforma.
                </p>
              ) : (
                <form className="d-grid gap-3" onSubmit={handleCreateUser}>
                  <input
                    className="form-control"
                    value={createFullName}
                    onChange={(event) => setCreateFullName(event.target.value)}
                    placeholder="Nombre completo"
                  />
                  <input
                    className="form-control"
                    type="email"
                    value={createEmail}
                    onChange={(event) => setCreateEmail(event.target.value)}
                    placeholder="Correo de acceso"
                  />
                  <div className="tenant-inline-form-grid">
                    <select
                      className="form-select"
                      value={createRole}
                      onChange={(event) => setCreateRole(event.target.value)}
                    >
                      {creatableRoles.map((role) => (
                        <option key={role} value={role}>
                          {displayPlatformCode(role)}
                        </option>
                      ))}
                    </select>
                    <select
                      className="form-select"
                      value={createIsActive ? "active" : "inactive"}
                      onChange={(event) =>
                        setCreateIsActive(event.target.value === "active")
                      }
                    >
                      <option value="active">activo</option>
                      <option value="inactive">inactivo</option>
                    </select>
                  </div>
                  <input
                    className="form-control"
                    type="password"
                    value={createPassword}
                    onChange={(event) => setCreatePassword(event.target.value)}
                    placeholder="Contraseña inicial"
                  />
                  <p className="tenant-help-text">
                    {currentPlatformRole === "superadmin"
                      ? "Usa `admin` para gestión operativa de usuarios y `support` para apoyo diario. `superadmin` queda reservado como cuenta raíz única y no se crea desde este flujo."
                      : "Como administrador, desde aquí solo puedes crear usuarios `support`."}
                  </p>
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
                    Crear usuario
                  </button>
                </form>
              )}
            </PanelCard>

            <PanelCard
              title="Catálogo de usuarios de plataforma"
              subtitle="Busca, filtra y selecciona operadores para revisar su acceso."
            >
              <div className="tenant-catalog-filters">
                <input
                  className="form-control"
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  placeholder="Buscar por nombre, correo o rol"
                />
                <div className="tenant-inline-form-grid">
                  <select
                    className="form-select"
                    value={catalogRoleFilter}
                    onChange={(event) => setCatalogRoleFilter(event.target.value)}
                  >
                    <option value="">Todos los roles</option>
                    {PLATFORM_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {displayPlatformCode(role)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="form-select"
                    value={catalogStatusFilter}
                    onChange={(event) => setCatalogStatusFilter(event.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    <option value="active">activos</option>
                    <option value="inactive">inactivos</option>
                  </select>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="text-secondary">
                  Aún no hay usuarios de plataforma creados además del operador inicial.
                </div>
              ) : null}

              {users.length > 0 && filteredUsers.length === 0 ? (
                <div className="text-secondary">
                  No hay usuarios de plataforma que coincidan con los filtros actuales.
                </div>
              ) : null}

              {filteredUsers.length > 0 ? (
                <>
                  <div className="tenant-catalog-summary">
                    {filteredUsers.length} de {users.length} usuarios visibles
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
                                <span>{displayPlatformCode(user.role)}</span>
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
              <strong>{getPlatformActionFeedbackLabel(actionFeedback.scope)}:</strong>{" "}
              {actionFeedback.message}
            </div>
          ) : null}

          {selectedUser ? (
            <div className="tenant-action-grid">
              <PanelCard
                title={selectedUser.full_name}
                subtitle="Identidad básica y rol operativo del usuario de plataforma seleccionado."
              >
                <div className="tenant-detail-grid mb-4">
                  <DetailField label="Email" value={selectedUser.email} />
                  <DetailField
                    label="Rol"
                    value={displayPlatformCode(selectedUser.role)}
                  />
                  <DetailField
                    label="Estado"
                    value={<StatusBadge value={selectedUser.is_active ? "active" : "inactive"} />}
                  />
                  <DetailField
                    label="Creado"
                    value={formatDateTime(selectedUser.created_at)}
                  />
                </div>

                <form className="d-grid gap-3" onSubmit={handleUpdateUser}>
                  <input
                    className="form-control"
                    value={editFullName}
                    onChange={(event) => setEditFullName(event.target.value)}
                    placeholder="Nombre completo"
                    disabled={!canEditSelectedUser || isActionSubmitting}
                  />
                  <select
                    className="form-select"
                    value={editRole}
                    onChange={(event) => setEditRole(event.target.value)}
                    disabled={!canEditSelectedUser || isActionSubmitting}
                  >
                    {editableRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {displayPlatformCode(role)}
                      </option>
                    ))}
                  </select>
                  {!canEditSelectedUser ? (
                    <p className="tenant-help-text">
                      {selectedUser.role === "superadmin"
                        ? "La cuenta superadministradora no se crea ni se elimina desde aquí. Si existen superadministradores heredados, solo un superadministrador puede degradarlos o desactivarlos manteniendo siempre uno activo."
                        : "Tu rol actual no puede editar la identidad o el rol de este usuario."}
                    </p>
                  ) : null}
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={
                      isActionSubmitting ||
                      !canEditSelectedUser ||
                      !editFullName.trim()
                    }
                  >
                    Guardar identidad
                  </button>
                </form>
              </PanelCard>

              <div className="d-grid gap-4">
                <PanelCard
                  title="Estado operativo"
                  subtitle="Activa o desactiva el acceso de este usuario a la consola de plataforma."
                >
                  <p className="tenant-help-text">
                    Si este usuario es el último superadministrador activo, el
                    backend bloqueará la desactivación o el cambio de rol. Si ya
                    existe otro superadministrador activo, tampoco podrás
                    habilitar uno nuevo.
                  </p>
                  <button
                    className="btn btn-outline-primary mt-3"
                    type="button"
                    onClick={() => void handleToggleStatus()}
                    disabled={isActionSubmitting || !canToggleSelectedUser}
                  >
                    {selectedUser.is_active ? "Desactivar acceso" : "Activar acceso"}
                  </button>
                </PanelCard>

                <PanelCard
                  title="Contraseña inicial"
                  subtitle="Reemplaza la contraseña actual por una nueva clave controlada desde plataforma."
                >
                  <form className="d-grid gap-3" onSubmit={handleResetPassword}>
                    <input
                      className="form-control"
                      type="password"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      placeholder="Nueva contraseña"
                      disabled={!canResetSelectedUserPassword || isActionSubmitting}
                    />
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={
                        isActionSubmitting ||
                        !canResetSelectedUserPassword ||
                        !resetPassword.trim()
                      }
                    >
                      Actualizar contraseña
                    </button>
                  </form>
                </PanelCard>

                <PanelCard
                  title="Eliminar usuario"
                  subtitle="Borra de forma definitiva cuentas no críticas de plataforma."
                >
                  <p className="tenant-help-text">
                    No se elimina la cuenta `superadmin` y tampoco puedes borrar tu
                    propia cuenta desde esta consola.
                  </p>
                  <button
                    className="btn btn-outline-danger mt-3"
                    type="button"
                    onClick={() => setDeleteCandidate(selectedUser)}
                    disabled={isActionSubmitting || !canDeleteSelectedUser}
                  >
                    Eliminar usuario
                  </button>
                </PanelCard>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        title="Eliminar usuario de plataforma"
        description={
          deleteCandidate
            ? `Se eliminará de forma definitiva a ${deleteCandidate.full_name} (${deleteCandidate.email}).`
            : ""
        }
        confirmLabel="Eliminar usuario"
        cancelLabel="Cancelar"
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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "n/a";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
