import { NavLink } from "react-router-dom";
import { useLanguage } from "../../../../../../store/language-context";

export function BusinessCoreModuleNav() {
  const { language } = useLanguage();

  const items = [
    {
      to: "/tenant-portal/business-core",
      label: language === "es" ? "Resumen" : "Overview",
    },
    {
      to: "/tenant-portal/business-core/organizations",
      label: language === "es" ? "Empresas" : "Organizations",
    },
    {
      to: "/tenant-portal/business-core/site-responsibles",
      label: language === "es" ? "Responsables" : "Responsibles",
    },
    {
      to: "/tenant-portal/business-core/clients",
      label: language === "es" ? "Clientes" : "Clients",
    },
    {
      to: "/tenant-portal/business-core/duplicates",
      label: language === "es" ? "Duplicados" : "Duplicates",
    },
    {
      to: "/tenant-portal/business-core/function-profiles",
      label: language === "es" ? "Perfiles" : "Profiles",
    },
    {
      to: "/tenant-portal/business-core/work-groups",
      label: language === "es" ? "Grupos" : "Groups",
    },
    {
      to: "/tenant-portal/business-core/task-types",
      label: language === "es" ? "Tipos de tarea" : "Task types",
    },
    {
      to: "/tenant-portal/business-core/taxonomy",
      label: language === "es" ? "Taxonomías" : "Taxonomy",
    },
  ];

  return (
    <div className="business-core-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/tenant-portal/business-core"}
          className={({ isActive }) =>
            `business-core-nav__item${isActive ? " is-active" : ""}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
