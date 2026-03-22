import { NavLink } from "react-router-dom";
import { useLanguage } from "../../../store/language-context";

export function TenantSidebarNav() {
  const { language } = useLanguage();
  const navItems = [
    { to: "/tenant-portal", label: language === "es" ? "Resumen" : "Overview" },
    { to: "/tenant-portal/users", label: language === "es" ? "Usuarios" : "Users" },
    { to: "/tenant-portal/finance", label: language === "es" ? "Finanzas" : "Finance" },
  ];

  return (
    <aside className="platform-sidebar">
      <div className="platform-sidebar__brand">
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
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
