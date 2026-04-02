import { NavLink } from "react-router-dom";
import { AppIcon, type AppIconName } from "../../../design-system/AppIcon";
import { useLanguage } from "../../../store/language-context";

export function TenantSidebarNav() {
  const { language } = useLanguage();
  const navItems = [
    {
      to: "/tenant-portal",
      label: language === "es" ? "Resumen" : "Overview",
      icon: "overview" as AppIconName,
    },
    {
      to: "/tenant-portal/users",
      label: language === "es" ? "Usuarios" : "Users",
      icon: "users" as AppIconName,
    },
    {
      to: "/tenant-portal/finance",
      label: language === "es" ? "Finanzas" : "Finance",
      icon: "finance" as AppIconName,
    },
    {
      to: "/tenant-portal/maintenance",
      label: language === "es" ? "Mantenciones" : "Maintenance",
      icon: "maintenance" as AppIconName,
    },
  ];

  return (
    <aside className="platform-sidebar">
      <div className="platform-sidebar__brand">
        <div className="platform-sidebar__brand-mark">
          <AppIcon name="finance" size={18} />
        </div>
        <div className="platform-sidebar__eyebrow">Platform PaaS</div>
        <div className="platform-sidebar__title">
          {language === "es" ? "Portal Tenant" : "Tenant Portal"}
        </div>
      </div>
      <nav className="platform-sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/tenant-portal"}
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
