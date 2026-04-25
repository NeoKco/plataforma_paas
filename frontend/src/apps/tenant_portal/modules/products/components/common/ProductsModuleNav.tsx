import { NavLink } from "react-router-dom";
import { AppIcon } from "../../../../../../design-system/AppIcon";
import { useLanguage } from "../../../../../../store/language-context";

export function ProductsModuleNav() {
  const { language } = useLanguage();
  const items = [
    {
      to: "/tenant-portal/products",
      label: language === "es" ? "Resumen" : "Overview",
      icon: "products" as const,
    },
    {
      to: "/tenant-portal/products/catalog",
      label: language === "es" ? "Catálogo" : "Catalog",
      icon: "products" as const,
    },
    {
      to: "/tenant-portal/products/ingestion",
      label: language === "es" ? "Ingesta" : "Ingestion",
      icon: "catalogs" as const,
    },
    {
      to: "/tenant-portal/products/sources",
      label: language === "es" ? "Fuentes/precios" : "Sources/prices",
      icon: "reports" as const,
    },
    {
      to: "/tenant-portal/products/connectors",
      label: language === "es" ? "Conectores" : "Connectors",
      icon: "settings" as const,
    },
    {
      to: "/tenant-portal/products/comparisons",
      label: language === "es" ? "Comparación" : "Comparison",
      icon: "reports" as const,
    },
  ];

  return (
    <div className="crm-module-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/tenant-portal/products"}
          className={({ isActive }) => `crm-module-nav__link${isActive ? " is-active" : ""}`}
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
