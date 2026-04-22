import { NavLink } from "react-router-dom";
import {
  pickLocalizedText,
  useLanguage,
} from "../../../../../../store/language-context";

export function BusinessCoreModuleNav() {
  const { language } = useLanguage();

  const items = [
    {
      to: "/tenant-portal/business-core",
      label: pickLocalizedText(language, { es: "Resumen", en: "Overview" }),
    },
    {
      to: "/tenant-portal/business-core/organizations",
      label: pickLocalizedText(language, { es: "Empresas", en: "Organizations" }),
    },
    {
      to: "/tenant-portal/business-core/clients",
      label: pickLocalizedText(language, { es: "Clientes", en: "Clients" }),
    },
    {
      to: "/tenant-portal/business-core/common-organization-name",
      label: pickLocalizedText(language, { es: "Nombre común", en: "Common name" }),
    },
    {
      to: "/tenant-portal/business-core/duplicates",
      label: pickLocalizedText(language, { es: "Duplicados", en: "Duplicates" }),
    },
    {
      to: "/tenant-portal/business-core/function-profiles",
      label: pickLocalizedText(language, { es: "Perfiles", en: "Profiles" }),
    },
    {
      to: "/tenant-portal/business-core/asset-types",
      label: pickLocalizedText(language, { es: "Tipos de activo", en: "Asset types" }),
    },
    {
      to: "/tenant-portal/business-core/assets",
      label: pickLocalizedText(language, { es: "Activos", en: "Assets" }),
    },
    {
      to: "/tenant-portal/business-core/work-groups",
      label: pickLocalizedText(language, { es: "Grupos", en: "Groups" }),
    },
    {
      to: "/tenant-portal/business-core/task-types",
      label: pickLocalizedText(language, { es: "Tipos de tarea", en: "Task types" }),
    },
    {
      to: "/tenant-portal/business-core/taxonomy",
      label: pickLocalizedText(language, { es: "Taxonomías", en: "Taxonomy" }),
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
