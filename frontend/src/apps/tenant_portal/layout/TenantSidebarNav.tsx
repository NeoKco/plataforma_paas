import { NavLink } from "react-router-dom";
import { AppIcon, type AppIconName } from "../../../design-system/AppIcon";
import { useLanguage } from "../../../store/language-context";
import { useTenantAuth } from "../../../store/tenant-auth-context";
import { isTenantPortalSectionVisible } from "../utils/module-visibility";

export function TenantSidebarNav() {
  const { language } = useLanguage();
  const { tenantInfo } = useTenantAuth();
  const navItems = [
    {
      to: "/tenant-portal",
      label: language === "es" ? "Resumen" : "Overview",
      icon: "overview" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "overview"),
    },
    {
      to: "/tenant-portal/users",
      label: language === "es" ? "Usuarios" : "Users",
      icon: "users" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "users"),
    },
    {
      to: "/tenant-portal/business-core",
      label: language === "es" ? "Core negocio" : "Business core",
      icon: "business-core" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "business-core"),
    },
    {
      to: "/tenant-portal/finance",
      label: language === "es" ? "Finanzas" : "Finance",
      icon: "finance" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "finance"),
    },
    {
      to: "/tenant-portal/products",
      label: language === "es" ? "Catálogo" : "Catalog",
      icon: "products" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "products"),
    },
    {
      to: "/tenant-portal/chat",
      label: language === "es" ? "Chat interno" : "Internal chat",
      icon: "chat" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "chat"),
    },
    {
      to: "/tenant-portal/crm",
      label: language === "es" ? "CRM" : "CRM",
      icon: "crm" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "crm"),
    },
    {
      to: "/tenant-portal/taskops",
      label: language === "es" ? "TaskOps" : "TaskOps",
      icon: "taskops" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "taskops"),
    },
    {
      to: "/tenant-portal/techdocs",
      label: language === "es" ? "Expediente técnico" : "Technical dossier",
      icon: "techdocs" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "techdocs"),
    },
    {
      to: "/tenant-portal/agenda",
      label: language === "es" ? "Agenda" : "Agenda",
      icon: "planning" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "agenda"),
    },
    {
      to: "/tenant-portal/maintenance",
      label: language === "es" ? "Mantenciones" : "Maintenance",
      icon: "maintenance" as AppIconName,
      visible: isTenantPortalSectionVisible(tenantInfo, "maintenance"),
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
        {navItems.filter((item) => item.visible).map((item) => (
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
