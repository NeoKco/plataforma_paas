import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingBlock } from "../../../components/feedback/LoadingBlock";
import { useTenantAuth } from "../../../store/tenant-auth-context";
import { TenantShell } from "../layout/TenantShell";

export function RequireTenantAuth() {
  const { hadStoredSession, isAuthenticated, isHydrated } = useTenantAuth();
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="container py-5">
        <LoadingBlock label="Restaurando sesión tenant..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/tenant-portal/login"
        replace
        state={{
          message: hadStoredSession
            ? "Tu sesión tenant expiró. Vuelve a iniciar sesión."
            : "Debes iniciar sesión tenant para continuar.",
          from: location.pathname,
        }}
      />
    );
  }

  return (
    <TenantShell>
      <Outlet />
    </TenantShell>
  );
}
