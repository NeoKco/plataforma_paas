import { Link } from "react-router-dom";
import { LanguageSelect } from "../../../components/common/LanguageSelect";
import { useLanguage } from "../../../store/language-context";
import { useTenantAuth } from "../../../store/tenant-auth-context";

export function TenantTopbar() {
  const { session, logout } = useTenantAuth();
  const { language } = useLanguage();

  return (
    <header className="platform-topbar">
      <div>
        <div className="platform-topbar__eyebrow">
          {language === "es" ? "Espacio Tenant" : "Tenant Workspace"}
        </div>
        <div className="platform-topbar__title">
          {session?.tenantSlug || "tenant"}
        </div>
      </div>
      <div className="d-flex align-items-center gap-3">
        <LanguageSelect />
        <Link className="platform-topbar__portal-link" to="/login">
          {language === "es" ? "Volver a plataforma" : "Back to platform"}
        </Link>
        <div className="text-end">
          <div className="small fw-semibold text-dark">
            {session?.fullName || session?.email}
          </div>
          <div className="small text-secondary">{session?.role}</div>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => void logout()}
        >
          {language === "es" ? "Salir" : "Logout"}
        </button>
      </div>
    </header>
  );
}
