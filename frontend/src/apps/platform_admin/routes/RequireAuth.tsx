import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingBlock } from "../../../components/feedback/LoadingBlock";
import { useAuth } from "../../../store/auth-context";
import { AppShell } from "../layout/AppShell";

export function RequireAuth() {
  const { hadStoredSession, isAuthenticated, isHydrated } = useAuth();
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="container py-5">
        <LoadingBlock label="Restaurando sesión..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          message: hadStoredSession
            ? "Tu sesión expiró. Vuelve a iniciar sesión."
            : "Debes iniciar sesión para continuar.",
          from: location.pathname,
        }}
      />
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
