import { NavLink } from "react-router-dom";
import { AppIcon, type AppIconName } from "../../../design-system/AppIcon";
import { useLanguage } from "../../../store/language-context";
import { useAuth } from "../../../store/auth-context";
import {
  canAccessPlatformNavItem,
  normalizePlatformAdminRole,
  type PlatformNavKey,
} from "../access/platformRoleAccess";

export function SidebarNav() {
  const { language } = useLanguage();
  const { session } = useAuth();
  const currentRole = normalizePlatformAdminRole(session?.role);
  const navItems: Array<{
    key: PlatformNavKey;
    to: string;
    label: string;
    icon: AppIconName;
  }> = [
    {
      key: "dashboard",
      to: "/",
      label: language === "es" ? "Resumen" : "Dashboard",
      icon: "dashboard",
    },
    {
      key: "users",
      to: "/users",
      label: language === "es" ? "Usuarios plataforma" : "Platform Users",
      icon: "users",
    },
    {
      key: "activity",
      to: "/activity",
      label: language === "es" ? "Actividad" : "Activity",
      icon: "activity",
    },
    {
      key: "tenants",
      to: "/tenants",
      label: language === "es" ? "Tenants" : "Tenants",
      icon: "tenants",
    },
    {
      key: "tenant-history",
      to: "/tenant-history",
      label: language === "es" ? "Histórico tenants" : "Tenant History",
      icon: "tenant-history",
    },
    {
      key: "provisioning",
      to: "/provisioning",
      label: language === "es" ? "Provisioning" : "Provisioning",
      icon: "provisioning",
    },
    {
      key: "billing",
      to: "/billing",
      label: language === "es" ? "Facturación" : "Billing",
      icon: "billing",
    },
    {
      key: "settings",
      to: "/settings",
      label: language === "es" ? "Configuración" : "Settings",
      icon: "settings",
    },
  ];
  const visibleNavItems = navItems.filter((item) =>
    canAccessPlatformNavItem(currentRole, item.key)
  );

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
