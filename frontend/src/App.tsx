import { AuthProvider } from "./store/auth-context";
import { InstallProvider } from "./store/install-context";
import { LanguageProvider } from "./store/language-context";
import { TenantAuthProvider } from "./store/tenant-auth-context";
import { AppRouter } from "./apps/platform_admin/routes/AppRouter";

export function App() {
  return (
    <LanguageProvider>
      <InstallProvider>
        <AuthProvider>
          <TenantAuthProvider>
            <AppRouter />
          </TenantAuthProvider>
        </AuthProvider>
      </InstallProvider>
    </LanguageProvider>
  );
}
