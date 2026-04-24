import { NavLink } from "react-router-dom";
import { AppIcon } from "../../../../../../design-system/AppIcon";
import { useLanguage } from "../../../../../../store/language-context";

export function TechDocsModuleNav() {
  const { language } = useLanguage();
  const items = [
    {
      to: "/tenant-portal/techdocs",
      label: language === "es" ? "Resumen" : "Overview",
      icon: "techdocs" as const,
    },
    {
      to: "/tenant-portal/techdocs/dossiers",
      label: language === "es" ? "Expedientes" : "Dossiers",
      icon: "techdocs" as const,
    },
    {
      to: "/tenant-portal/techdocs/audit",
      label: language === "es" ? "Auditoría" : "Audit",
      icon: "activity" as const,
    },
  ];

  return (
    <div className="techdocs-module-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/tenant-portal/techdocs"}
          className={({ isActive }) =>
            `techdocs-module-nav__link${isActive ? " is-active" : ""}`
          }
        >
          <span className="techdocs-module-nav__icon">
            <AppIcon name={item.icon} size={16} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
