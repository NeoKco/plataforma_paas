import { NavLink } from "react-router-dom";
import { useLanguage } from "../../../store/language-context";
import { useAuth } from "../../../store/auth-context";

export function SidebarNav() {
  const { language } = useLanguage();
  const { session } = useAuth();
  const currentRole = session?.role || "support";
  const navItems = [
    {
      to: "/users",
      label: language === "es" ? "Usuarios plataforma" : "Platform Users",
    },
  ];
  const superadminOnlyItems = [
    { to: "/", label: language === "es" ? "Resumen" : "Dashboard" },
    { to: "/tenants", label: language === "es" ? "Tenants" : "Tenants" },
    {
      to: "/provisioning",
      label: language === "es" ? "Provisioning" : "Provisioning",
    },
    { to: "/billing", label: language === "es" ? "Facturación" : "Billing" },
    { to: "/settings", label: language === "es" ? "Configuración" : "Settings" },
  ];
  const visibleNavItems =
    currentRole === "superadmin"
      ? [superadminOnlyItems[0], ...navItems, ...superadminOnlyItems.slice(1)]
      : navItems;

  return (
    <aside className="platform-sidebar">
      <div className="platform-sidebar__brand">
        <div className="platform-sidebar__eyebrow">Platform PaaS</div>
        <div className="platform-sidebar__title">
          {language === "es" ? "Administración" : "Platform Admin"}
        </div>
      </div>
      <nav className="platform-sidebar__nav">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `platform-sidebar__link${isActive ? " is-active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
