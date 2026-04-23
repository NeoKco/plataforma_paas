import { NavLink } from "react-router-dom";
import { AppIcon } from "../../../../../../design-system/AppIcon";
import { useLanguage } from "../../../../../../store/language-context";

export function CRMModuleNav() {
  const { language } = useLanguage();
  const items = [
    {
      to: "/tenant-portal/crm",
      label: language === "es" ? "Resumen" : "Overview",
      icon: "crm" as const,
    },
    {
      to: "/tenant-portal/crm/opportunities",
      label: language === "es" ? "Oportunidades" : "Opportunities",
      icon: "pipeline" as const,
    },
    {
      to: "/tenant-portal/crm/quotes",
      label: language === "es" ? "Cotizaciones" : "Quotes",
      icon: "quotes" as const,
    },
    {
      to: "/tenant-portal/crm/products",
      label: language === "es" ? "Productos" : "Products",
      icon: "products" as const,
    },
  ];

  return (
    <div className="crm-module-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/tenant-portal/crm"}
          className={({ isActive }) =>
            `crm-module-nav__link${isActive ? " is-active" : ""}`
          }
        >
          <span className="crm-module-nav__icon">
            <AppIcon name={item.icon} size={16} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
