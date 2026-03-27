import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/tenant-portal/finance", label: "Movimientos" },
  { to: "/tenant-portal/finance/budgets", label: "Presupuestos" },
  { to: "/tenant-portal/finance/loans", label: "Préstamos" },
  { to: "/tenant-portal/finance/calendar", label: "Planificación" },
  { to: "/tenant-portal/finance/reports", label: "Reportes" },
  { to: "/tenant-portal/finance/accounts", label: "Cuentas" },
  { to: "/tenant-portal/finance/categories", label: "Categorías" },
  { to: "/tenant-portal/finance/tools", label: "Catálogos" },
  { to: "/tenant-portal/finance/settings", label: "Configuración" },
];

export function FinanceModuleNav() {
  return (
    <div className="finance-module-nav">
      {NAV_ITEMS.map((item) => (
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
