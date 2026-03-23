import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  createTenantUser,
  getTenantUsers,
  updateTenantUserStatus,
} from "../../../../services/tenant-api";
import { getApiErrorDisplayMessage } from "../../../../services/api";
import { useTenantAuth } from "../../../../store/tenant-auth-context";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import type { ApiError, TenantUsersItem, TenantUsersResponse } from "../../../../types";

type ActionFeedback = {
  scope: string;
  type: "success" | "error";
  message: string;
};

const ROLE_OPTIONS = ["admin", "manager", "operator"];

function displayUserRole(value: string): string {
  return displayPlatformCode(value);
}

function formatTenantUserActionError(scope: string, error: ApiError): string {
  const message = getApiErrorDisplayMessage(error);

  if (message.includes("core.users.admin")) {
    if (scope.startsWith("user-status-")) {
      return "No puedes habilitar otro administrador porque tu plan permite solo 1 administrador activo y ese cupo ya está en uso.";
    }
    if (scope === "create-user") {
      return "No puedes crear otro administrador porque tu plan permite solo 1 administrador activo y ese cupo ya está en uso.";
    }
    return "Tu plan ya alcanzó el límite de administradores.";
  }

  if (message.includes("core.users.active")) {
    if (scope.startsWith("user-status-")) {
      return "No puedes habilitar otro usuario porque tu plan ya alcanzó el límite de usuarios activos.";
    }
    if (scope === "create-user") {
      return "No puedes crear otro usuario activo porque tu plan ya alcanzó el límite de usuarios activos.";
    }
    return "Tu plan ya alcanzó el límite de usuarios activos.";
  }

  if (message.includes("core.users.monthly")) {
    return "Tu plan ya alcanzó el límite mensual de creación de usuarios.";
  }

  if (message.includes("core.users")) {
    return "Tu plan ya alcanzó el límite total de usuarios.";
  }

  return message;
}

function getActionFeedbackLabel(scope: string): string {
  if (scope.startsWith("user-status-")) {
    return "Estado del usuario";
  }
  if (scope === "create-user") {
    return "Crear usuario";
  }
  return scope;
}

export function TenantUsersPage() {
  const { session } = useTenantAuth();
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
        message: result.message,
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope,
        type: "error",
        message: formatTenantUserActionError(scope, typedError),
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
        eyebrow="Espacio"
        title="Usuarios"
        description="Gestiona las personas que pueden entrar a tu espacio y el estado de sus cuentas."
      />

      {actionFeedback ? (
        <div
          className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
        >
          <strong>{getActionFeedbackLabel(actionFeedback.scope)}:</strong>{" "}
          {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Cargando usuarios del tenant..." /> : null}

      <div className="tenant-portal-metrics">
        <MetricCard label="Usuarios totales" value={overview.totalUsers} hint="Cuentas visibles" />
        <MetricCard label="Usuarios activos" value={overview.activeUsers} hint="Con acceso habilitado" />
        <MetricCard label="Usuarios inactivos" value={overview.inactiveUsers} hint="Sin acceso actual" />
        <MetricCard label="Administradores" value={overview.adminUsers} hint="Con rol admin" />
      </div>

      {error ? (
        <ErrorState
          title="Usuarios tenant no disponibles"
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--users">
        <PanelCard
          title="Crear usuario"
          subtitle="Completa los datos de acceso inicial para una nueva cuenta."
        >
          <form className="d-grid gap-3" onSubmit={handleCreateUser}>
            <div>
              <label className="form-label">Nombre completo</label>
              <input
                className="form-control"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ej: María Pérez"
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Ej: maria@empresa-demo.local"
              />
            </div>
            <div>
              <label className="form-label">Contraseña</label>
              <input
                className="form-control"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Define una contraseña inicial"
              />
            </div>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Rol</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  {ROLE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {displayUserRole(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Estado inicial</label>
                <select
                  className="form-select"
                  value={isActive ? "active" : "inactive"}
                  onChange={(event) => setIsActive(event.target.value === "active")}
                >
                  <option value="active">activo</option>
                  <option value="inactive">inactivo</option>
                </select>
              </div>
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isActionSubmitting}
            >
              Crear usuario
            </button>
          </form>
        </PanelCard>

        <PanelCard
          title="Operador actual"
          subtitle="Contexto de la sesión con la que estás operando este tenant."
        >
          <div className="tenant-detail-grid">
            <DetailField label="Tenant" value={session?.tenantSlug || "n/a"} />
            <DetailField label="Email" value={session?.email || "n/a"} />
            <DetailField
              label="Rol"
              value={session?.role ? displayUserRole(session.role) : "n/a"}
            />
            <DetailField label="ID usuario" value={session?.userId || "n/a"} />
          </div>
        </PanelCard>
      </div>

      {users.length > 0 ? (
        <DataTableCard
          title="Usuarios del tenant"
          rows={users}
          columns={[
            {
              key: "full_name",
              header: "Nombre completo",
              render: (row) => row.full_name,
            },
            {
              key: "email",
              header: "Email",
              render: (row) => row.email,
            },
            {
              key: "role",
              header: "Rol",
              render: (row) => displayUserRole(row.role),
            },
            {
              key: "is_active",
              header: "Estado",
              render: (row) => (
                <StatusBadge value={row.is_active ? "active" : "inactive"} />
              ),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handleToggleStatus(row)}
                  disabled={isActionSubmitting}
                >
                  {row.is_active ? "Desactivar" : "Activar"}
                </button>
              ),
            },
          ]}
        />
      ) : !isLoading && !error ? (
        <PanelCard title="Usuarios del tenant">
          <div className="text-secondary">
            Aún no se devolvieron usuarios para este tenant.
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
