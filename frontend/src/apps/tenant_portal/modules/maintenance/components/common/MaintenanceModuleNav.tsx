import { NavLink } from "react-router-dom";
import { AppIcon } from "../../../../../../design-system/AppIcon";
import { useLanguage } from "../../../../../../store/language-context";

export function MaintenanceModuleNav() {
  const { language } = useLanguage();
  const navItems = [
    {
      to: "/tenant-portal/maintenance",
      label: language === "es" ? "Resumen" : "Overview",
      icon: "maintenance" as const,
    },
    {
      to: "/tenant-portal/maintenance/due-items",
      label: language === "es" ? "Pendientes" : "Due",
      icon: "planning" as const,
    },
    {
      to: "/tenant-portal/maintenance/work-orders",
      label: language === "es" ? "Mantenciones" : "Work orders",
      icon: "planning" as const,
    },
    {
      to: "/tenant-portal/maintenance/installations",
      label: language === "es" ? "Instalaciones" : "Installations",
      icon: "catalogs" as const,
    },
    {
      to: "/tenant-portal/maintenance/equipment-types",
      label: language === "es" ? "Tipos de equipo" : "Equipment types",
      icon: "categories" as const,
    },
    {
      to: "/tenant-portal/maintenance/history",
      label: language === "es" ? "Historial" : "History",
      icon: "tenant-history" as const,
    },
    {
      to: "/tenant-portal/maintenance/calendar",
      label: language === "es" ? "Agenda" : "Calendar",
      icon: "overview" as const,
    },
  ];

  return (
    <div className="maintenance-module-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/tenant-portal/maintenance"}
          className={({ isActive }) =>
            `maintenance-module-nav__link${isActive ? " is-active" : ""}`
          }
        >
          <span className="maintenance-module-nav__icon">
            <AppIcon name={item.icon} size={16} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
