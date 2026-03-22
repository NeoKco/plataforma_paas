import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { AuthProvider } from "./store/auth-context";
import { InstallProvider } from "./store/install-context";
import { LanguageProvider } from "./store/language-context";
import { useAuth } from "./store/auth-context";
import { TenantAuthProvider } from "./store/tenant-auth-context";
import { useTenantAuth } from "./store/tenant-auth-context";
import { AppRouter } from "./apps/platform_admin/routes/AppRouter";

export function App() {
  return (
    <LanguageProvider>
      <InstallProvider>
        <AuthProvider>
          <TenantAuthProvider>
            <SessionExpiryWarnings />
            <AppRouter />
          </TenantAuthProvider>
        </AuthProvider>
      </InstallProvider>
    </LanguageProvider>
  );
}

function SessionExpiryWarnings() {
  const platformAuth = useAuth();
  const tenantAuth = useTenantAuth();

  const activeWarning =
    platformAuth.isAuthenticated && platformAuth.isExpiryWarningOpen
      ? {
          title: "Tu sesión de plataforma está por expirar",
          description:
            "Detectamos inactividad. Si quieres seguir trabajando, confirma para continuar con tu sesión.",
          details: [
            "La sesión se cerrará automáticamente si no hay continuidad de uso.",
            "Puedes continuar ahora o cerrar sesión manualmente.",
          ],
          onConfirm: platformAuth.continueSession,
          onCancel: platformAuth.logout,
        }
      : tenantAuth.isAuthenticated && tenantAuth.isExpiryWarningOpen
        ? {
            title: "Tu sesión tenant está por expirar",
            description:
              "Detectamos inactividad en el portal tenant. Confirma si quieres seguir operando.",
            details: [
              "La sesión se cerrará automáticamente si no registramos actividad.",
              "Puedes continuar ahora o cerrar sesión manualmente.",
            ],
            onConfirm: tenantAuth.continueSession,
            onCancel: tenantAuth.logout,
          }
        : null;

  return (
    <ConfirmDialog
      isOpen={Boolean(activeWarning)}
      title={activeWarning?.title || ""}
      description={activeWarning?.description || ""}
      details={activeWarning?.details || []}
      confirmLabel="Continuar sesión"
      cancelLabel="Cerrar sesión"
      onConfirm={() => {
        if (!activeWarning) {
          return;
        }
        void activeWarning.onConfirm();
      }}
      onCancel={() => {
        if (!activeWarning) {
          return;
        }
        void activeWarning.onCancel();
      }}
      tone="warning"
    />
  );
}
