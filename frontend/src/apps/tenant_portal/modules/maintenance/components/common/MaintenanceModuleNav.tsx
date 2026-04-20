import { NavLink } from "react-router-dom";
import { AppIcon } from "../../../../../../design-system/AppIcon";
import {
  pickLocalizedText,
  useLanguage,
} from "../../../../../../store/language-context";

export function MaintenanceModuleNav() {
  const { language } = useLanguage();
  const navItems = [
    {
      to: "/tenant-portal/maintenance",
      label: pickLocalizedText(language, { es: "Resumen", en: "Overview" }),
      icon: "maintenance" as const,
    },
    {
      to: "/tenant-portal/maintenance/due-items",
      label: pickLocalizedText(language, { es: "Pendientes", en: "Due" }),
      icon: "planning" as const,
    },
    {
      to: "/tenant-portal/maintenance/work-orders",
      label: pickLocalizedText(language, { es: "Mantenciones", en: "Work orders" }),
      icon: "planning" as const,
    },
    {
      to: "/tenant-portal/maintenance/installations",
      label: pickLocalizedText(language, { es: "Instalaciones", en: "Installations" }),
      icon: "catalogs" as const,
    },
    {
      to: "/tenant-portal/maintenance/equipment-types",
      label: pickLocalizedText(language, { es: "Tipos de equipo", en: "Equipment types" }),
      icon: "categories" as const,
    },
    {
      to: "/tenant-portal/maintenance/cost-templates",
      label: pickLocalizedText(language, {
        es: "Costos de mantenciones",
        en: "Maintenance costs",
      }),
      icon: "categories" as const,
    },
    {
      to: "/tenant-portal/maintenance/history",
      label: pickLocalizedText(language, { es: "Historial", en: "History" }),
      icon: "tenant-history" as const,
    },
    {
      to: "/tenant-portal/maintenance/reports",
      label: pickLocalizedText(language, { es: "Reportes", en: "Reports" }),
      icon: "reports" as const,
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
