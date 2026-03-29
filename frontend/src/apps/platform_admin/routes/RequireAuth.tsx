import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingBlock } from "../../../components/feedback/LoadingBlock";
import { useAuth } from "../../../store/auth-context";
import { useLanguage } from "../../../store/language-context";
import { AppShell } from "../layout/AppShell";

export function RequireAuth() {
  const { hadStoredSession, isAuthenticated, isHydrated } = useAuth();
  const { language } = useLanguage();
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
            ? language === "es"
              ? "Tu sesión expiró. Vuelve a iniciar sesión."
              : "Your session expired. Sign in again."
            : language === "es"
              ? "Debes iniciar sesión para continuar."
              : "You must sign in to continue.",
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
