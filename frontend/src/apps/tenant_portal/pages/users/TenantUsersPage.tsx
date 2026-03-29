import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import {
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../design-system/AppForm";
import { AppToolbar } from "../../../../design-system/AppLayout";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  createTenantUser,
  getTenantUsers,
  updateTenantUserStatus,
} from "../../../../services/tenant-api";
import { getApiErrorDisplayMessage } from "../../../../services/api";
import { useLanguage } from "../../../../store/language-context";
import { useTenantAuth } from "../../../../store/tenant-auth-context";
import { getTenantPortalActionSuccessMessage } from "../../../../utils/action-feedback";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import type { ApiError, TenantUsersItem, TenantUsersResponse } from "../../../../types";

type ActionFeedback = {
  scope: string;
  type: "success" | "error";
  message: string;
};

const ROLE_OPTIONS = ["admin", "manager", "operator"];

function displayUserRole(value: string, language: "es" | "en"): string {
  return displayPlatformCode(value, language);
}

function formatTenantUserActionError(
  scope: string,
  error: ApiError,
  language: "es" | "en"
): string {
  const message = getApiErrorDisplayMessage(error);

  if (message.includes("core.users.admin")) {
    if (scope.startsWith("user-status-")) {
      return language === "es"
        ? "No puedes habilitar otro administrador porque tu plan permite solo 1 administrador activo y ese cupo ya está en uso."
        : "You cannot enable another admin because your plan allows only 1 active admin and that slot is already in use.";
    }
    if (scope === "create-user") {
      return language === "es"
        ? "No puedes crear otro administrador porque tu plan permite solo 1 administrador activo y ese cupo ya está en uso."
        : "You cannot create another admin because your plan allows only 1 active admin and that slot is already in use.";
    }
    return language === "es"
      ? "Tu plan ya alcanzó el límite de administradores."
      : "Your plan has already reached the admin limit.";
  }

  if (message.includes("core.users.active")) {
    if (scope.startsWith("user-status-")) {
      return language === "es"
        ? "No puedes habilitar otro usuario porque tu plan ya alcanzó el límite de usuarios activos."
        : "You cannot enable another user because your plan has already reached the active user limit.";
    }
    if (scope === "create-user") {
      return language === "es"
        ? "No puedes crear otro usuario activo porque tu plan ya alcanzó el límite de usuarios activos."
        : "You cannot create another active user because your plan has already reached the active user limit.";
    }
    return language === "es"
      ? "Tu plan ya alcanzó el límite de usuarios activos."
      : "Your plan has already reached the active user limit.";
  }

  if (message.includes("core.users.monthly")) {
    return language === "es"
      ? "Tu plan ya alcanzó el límite mensual de creación de usuarios."
      : "Your plan has already reached the monthly user creation limit.";
  }

  if (message.includes("core.users")) {
    return language === "es"
      ? "Tu plan ya alcanzó el límite total de usuarios."
      : "Your plan has already reached the total user limit.";
  }

  return message;
}

function getActionFeedbackLabel(scope: string, language: "es" | "en"): string {
  if (scope.startsWith("user-status-")) {
    return language === "es" ? "Estado del usuario" : "User status";
  }
  if (scope === "create-user") {
    return language === "es" ? "Crear usuario" : "Create user";
  }
  return scope;
}

export function TenantUsersPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [usersResponse, setUsersResponse] = useState<TenantUsersResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operator");
  const [isActive, setIsActive] = useState(true);

  const users = usersResponse?.data || [];

  const overview = useMemo(() => {
    return {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.is_active).length,
      inactiveUsers: users.filter((user) => !user.is_active).length,
      adminUsers: users.filter((user) => user.role === "admin").length,
    };
  }, [users]);

  async function loadUsers() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getTenantUsers(session.accessToken);
      setUsersResponse(response);
    } catch (rawError) {
      setUsersResponse(null);
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  function handleHeaderReload() {
    void loadUsers();
  }

  useEffect(() => {
    void loadUsers();
  }, [session?.accessToken]);

  async function runAction(
    scope: string,
    action: () => Promise<{ message: string }>
  ) {
    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const result = await action();
      await loadUsers();
      setActionFeedback({
        scope,
        type: "success",
        message: getTenantPortalActionSuccessMessage(scope, result.message, language),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope,
        type: "error",
        message: formatTenantUserActionError(scope, typedError, language),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  function resetCreateForm() {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("operator");
    setIsActive(true);
  }

  function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    void runAction("create-user", async () => {
      const response = await createTenantUser(session.accessToken, {
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
        is_active: isActive,
      });
      resetCreateForm();
      return response;
    });
  }

  function handleToggleStatus(user: TenantUsersItem) {
    if (!session?.accessToken) {
      return;
    }

    void runAction(`user-status-${user.id}`, () =>
      updateTenantUserStatus(session.accessToken, user.id, {
        is_active: !user.is_active,
      })
    );
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Espacio" : "Workspace"}
        icon="users"
        title={language === "es" ? "Usuarios" : "Users"}
        description={
          language === "es"
            ? "Gestiona las personas que pueden entrar a tu espacio y el estado de sus cuentas."
            : "Manage the people who can access your workspace and the status of their accounts."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={handleHeaderReload}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />

      {actionFeedback ? (
        <div
          className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
        >
          <strong>{getActionFeedbackLabel(actionFeedback.scope, language)}:</strong>{" "}
          {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando usuarios del tenant..."
              : "Loading tenant users..."
          }
        />
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard label={language === "es" ? "Usuarios totales" : "Total users"} icon="users" tone="default" value={overview.totalUsers} hint={language === "es" ? "Cuentas visibles" : "Visible accounts"} />
        <MetricCard label={language === "es" ? "Usuarios activos" : "Active users"} icon="overview" tone="success" value={overview.activeUsers} hint={language === "es" ? "Con acceso habilitado" : "With access enabled"} />
        <MetricCard label={language === "es" ? "Usuarios inactivos" : "Inactive users"} icon="settings" tone="warning" value={overview.inactiveUsers} hint={language === "es" ? "Sin acceso actual" : "Without current access"} />
        <MetricCard label={language === "es" ? "Administradores" : "Admins"} icon="dashboard" tone="info" value={overview.adminUsers} hint={language === "es" ? "Con rol admin" : "With admin role"} />
      </div>

      {error ? (
        <ErrorState
          title={language === "es" ? "Usuarios tenant no disponibles" : "Tenant users unavailable"}
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--users">
        <PanelCard
          icon="users"
          title={language === "es" ? "Crear usuario" : "Create user"}
          subtitle={
            language === "es"
              ? "Completa los datos de acceso inicial para una nueva cuenta."
              : "Fill in the initial access data for a new account."
          }
        >
          <AppForm onSubmit={handleCreateUser}>
            <AppFormField label={language === "es" ? "Nombre completo" : "Full name"}>
              <input
                className="form-control"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={language === "es" ? "Ej: María Pérez" : "Example: Maria Perez"}
              />
            </AppFormField>
            <AppFormField label="Email">
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={language === "es" ? "Ej: maria@empresa-demo.local" : "Example: maria@empresa-demo.local"}
              />
            </AppFormField>
            <AppFormField label={language === "es" ? "Contraseña" : "Password"}>
              <input
                className="form-control"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={language === "es" ? "Define una contraseña inicial" : "Define an initial password"}
              />
            </AppFormField>
            <AppFormField label={language === "es" ? "Rol" : "Role"}>
                <select
                  className="form-select"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  {ROLE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {displayUserRole(value, language)}
                    </option>
                  ))}
                </select>
            </AppFormField>
            <AppFormField label={language === "es" ? "Estado inicial" : "Initial status"}>
                <select
                  className="form-select"
                  value={isActive ? "active" : "inactive"}
                  onChange={(event) => setIsActive(event.target.value === "active")}
                >
                  <option value="active">{language === "es" ? "activo" : "active"}</option>
                  <option value="inactive">{language === "es" ? "inactivo" : "inactive"}</option>
                </select>
            </AppFormField>
            <AppFormActions>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={isActionSubmitting}
              >
                {language === "es" ? "Crear usuario" : "Create user"}
              </button>
            </AppFormActions>
          </AppForm>
        </PanelCard>

        <PanelCard
          icon="settings"
          title={language === "es" ? "Operador actual" : "Current operator"}
          subtitle={
            language === "es"
              ? "Contexto de la sesión con la que estás operando este tenant."
              : "Context for the session currently operating this tenant."
          }
        >
          <div className="tenant-detail-grid">
            <DetailField
              label={language === "es" ? "Tenant" : "Tenant"}
              value={session?.tenantSlug || "n/a"}
            />
            <DetailField label="Email" value={session?.email || "n/a"} />
            <DetailField
              label={language === "es" ? "Rol" : "Role"}
              value={session?.role ? displayUserRole(session.role, language) : "n/a"}
            />
            <DetailField label={language === "es" ? "ID usuario" : "User ID"} value={session?.userId || "n/a"} />
          </div>
        </PanelCard>
      </div>

      {users.length > 0 ? (
        <DataTableCard
          title={language === "es" ? "Usuarios del tenant" : "Tenant users"}
          rows={users}
          columns={[
            {
              key: "full_name",
              header: language === "es" ? "Nombre completo" : "Full name",
              render: (row) => row.full_name,
            },
            {
              key: "email",
              header: "Email",
              render: (row) => row.email,
            },
            {
              key: "role",
              header: language === "es" ? "Rol" : "Role",
              render: (row) => displayUserRole(row.role, language),
            },
            {
              key: "is_active",
              header: language === "es" ? "Estado" : "Status",
              render: (row) => (
                <StatusBadge value={row.is_active ? "active" : "inactive"} />
              ),
            },
            {
              key: "actions",
              header: language === "es" ? "Acciones" : "Actions",
              render: (row) => (
                <AppToolbar compact>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleToggleStatus(row)}
                    disabled={isActionSubmitting}
                  >
                    {row.is_active
                      ? language === "es"
                        ? "Desactivar"
                        : "Deactivate"
                      : language === "es"
                        ? "Activar"
                        : "Activate"}
                  </button>
                </AppToolbar>
              ),
            },
          ]}
        />
      ) : !isLoading && !error ? (
        <PanelCard title={language === "es" ? "Usuarios del tenant" : "Tenant users"}>
          <div className="text-secondary">
            {language === "es"
              ? "Aún no se devolvieron usuarios para este tenant."
              : "No users were returned for this tenant yet."}
          </div>
        </PanelCard>
      ) : null}
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
