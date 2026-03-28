import { NavLink } from "react-router-dom";
import { AppIcon, type AppIconName } from "../../../design-system/AppIcon";
import { useLanguage } from "../../../store/language-context";
import { useAuth } from "../../../store/auth-context";

export function SidebarNav() {
  const { language } = useLanguage();
  const { session } = useAuth();
  const currentRole = session?.role || "support";
  const commonNavItems = [
    {
      to: "/users",
      label: language === "es" ? "Usuarios plataforma" : "Platform Users",
      icon: "users" as AppIconName,
    },
  ];
  const adminNavItems = [
    {
      to: "/activity",
      label: language === "es" ? "Actividad" : "Activity",
      icon: "activity" as AppIconName,
    },
  ];
  const superadminOnlyItems = [
    {
      to: "/",
      label: language === "es" ? "Resumen" : "Dashboard",
      icon: "dashboard" as AppIconName,
    },
    {
      to: "/tenants",
      label: language === "es" ? "Tenants" : "Tenants",
      icon: "tenants" as AppIconName,
    },
    {
      to: "/tenant-history",
      label: language === "es" ? "Histórico tenants" : "Tenant History",
      icon: "tenant-history" as AppIconName,
    },
    {
      to: "/provisioning",
      label: language === "es" ? "Provisioning" : "Provisioning",
      icon: "provisioning" as AppIconName,
    },
    {
      to: "/billing",
      label: language === "es" ? "Facturación" : "Billing",
      icon: "billing" as AppIconName,
    },
    {
      to: "/settings",
      label: language === "es" ? "Configuración" : "Settings",
      icon: "settings" as AppIconName,
    },
  ];
  const visibleNavItems =
    currentRole === "superadmin"
      ? [superadminOnlyItems[0], ...commonNavItems, ...adminNavItems, ...superadminOnlyItems.slice(1)]
      : currentRole === "admin"
        ? [...commonNavItems, ...adminNavItems]
        : commonNavItems;

  return (
    <aside className="platform-sidebar">
      <div className="platform-sidebar__brand">
        <div className="platform-sidebar__brand-mark">
          <AppIcon name="dashboard" size={18} />
        </div>
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
            <span className="platform-sidebar__link-icon">
              <AppIcon name={item.icon} size={16} />
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
