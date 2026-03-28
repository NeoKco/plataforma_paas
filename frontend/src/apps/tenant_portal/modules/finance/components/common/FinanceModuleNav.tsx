import { NavLink } from "react-router-dom";
import { useLanguage } from "../../../../../../store/language-context";

export function FinanceModuleNav() {
  const { language } = useLanguage();
  const navItems = [
    {
      to: "/tenant-portal/finance",
      label: language === "es" ? "Movimientos" : "Transactions",
    },
    {
      to: "/tenant-portal/finance/budgets",
      label: language === "es" ? "Presupuestos" : "Budgets",
    },
    {
      to: "/tenant-portal/finance/loans",
      label: language === "es" ? "Préstamos" : "Loans",
    },
    {
      to: "/tenant-portal/finance/calendar",
      label: language === "es" ? "Planificación" : "Planning",
    },
    {
      to: "/tenant-portal/finance/reports",
      label: language === "es" ? "Reportes" : "Reports",
    },
    {
      to: "/tenant-portal/finance/accounts",
      label: language === "es" ? "Cuentas" : "Accounts",
    },
    {
      to: "/tenant-portal/finance/categories",
      label: language === "es" ? "Categorías" : "Categories",
    },
    {
      to: "/tenant-portal/finance/tools",
      label: language === "es" ? "Catálogos" : "Catalogs",
    },
    {
      to: "/tenant-portal/finance/settings",
      label: language === "es" ? "Configuración" : "Settings",
    },
  ];

  return (
    <div className="finance-module-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/tenant-portal/finance"}
          className={({ isActive }) =>
            `finance-module-nav__link${isActive ? " is-active" : ""}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
