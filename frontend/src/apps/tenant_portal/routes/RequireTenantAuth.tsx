import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingBlock } from "../../../components/feedback/LoadingBlock";
import { useLanguage } from "../../../store/language-context";
import { useTenantAuth } from "../../../store/tenant-auth-context";
import { TenantShell } from "../layout/TenantShell";

export function RequireTenantAuth() {
  const { hadStoredSession, isAuthenticated, isHydrated } = useTenantAuth();
  const { language } = useLanguage();
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="container py-5">
        <LoadingBlock
          label={
            language === "es"
              ? "Restaurando sesión tenant..."
              : "Restoring tenant session..."
          }
        />
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
            ? language === "es"
              ? "Tu sesión tenant expiró. Vuelve a iniciar sesión."
              : "Your tenant session expired. Sign in again."
            : language === "es"
              ? "Debes iniciar sesión tenant para continuar."
              : "You must sign in to the tenant portal to continue.",
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
