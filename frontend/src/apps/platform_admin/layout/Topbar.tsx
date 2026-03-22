import { Link } from "react-router-dom";
import { LanguageSelect } from "../../../components/common/LanguageSelect";
import { useLanguage } from "../../../store/language-context";
import { useAuth } from "../../../store/auth-context";

export function Topbar() {
  const { session, logout } = useAuth();
  const { language } = useLanguage();

  return (
    <header className="platform-topbar">
      <div>
        <div className="platform-topbar__eyebrow">
          {language === "es" ? "Consola Operativa" : "Operations Console"}
        </div>
        <div className="platform-topbar__title">
          {language === "es" ? "Superficie de control de plataforma" : "Platform control surface"}
        </div>
      </div>
      <div className="d-flex align-items-center gap-3">
        <LanguageSelect />
        <Link className="platform-topbar__portal-link" to="/tenant-portal/login">
          {language === "es" ? "Portal tenant" : "Tenant portal"}
        </Link>
        <div className="text-end">
          <div className="small fw-semibold text-dark">{session?.fullName || session?.email}</div>
          <div className="small text-secondary">{session?.role}</div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => void logout()}>
          {language === "es" ? "Salir" : "Logout"}
        </button>
      </div>
    </header>
  );
}
