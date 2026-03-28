import { NavLink } from "react-router-dom";
import { useLanguage } from "../../../../../../store/language-context";
import { getFinanceModuleLabel } from "../../utils/presentation";
import { FinanceIcon, type FinanceIconName } from "./FinanceIcon";

export function FinanceModuleNav() {
  const { language } = useLanguage();
  const navItems = [
    {
      to: "/tenant-portal/finance",
      label: getFinanceModuleLabel("transactions", language),
      icon: "transactions" as FinanceIconName,
    },
    {
      to: "/tenant-portal/finance/budgets",
      label: getFinanceModuleLabel("budgets", language),
      icon: "budgets" as FinanceIconName,
    },
    {
      to: "/tenant-portal/finance/loans",
      label: getFinanceModuleLabel("loans", language),
      icon: "loans" as FinanceIconName,
    },
    {
      to: "/tenant-portal/finance/calendar",
      label: getFinanceModuleLabel("planning", language),
      icon: "planning" as FinanceIconName,
    },
    {
      to: "/tenant-portal/finance/reports",
      label: getFinanceModuleLabel("reports", language),
      icon: "reports" as FinanceIconName,
    },
    {
      to: "/tenant-portal/finance/accounts",
      label: getFinanceModuleLabel("accounts", language),
      icon: "accounts" as FinanceIconName,
    },
    {
      to: "/tenant-portal/finance/categories",
      label: getFinanceModuleLabel("categories", language),
      icon: "categories" as FinanceIconName,
    },
    {
      to: "/tenant-portal/finance/tools",
      label: getFinanceModuleLabel("catalogs", language),
      icon: "catalogs" as FinanceIconName,
    },
    {
      to: "/tenant-portal/finance/settings",
      label: getFinanceModuleLabel("settings", language),
      icon: "settings" as FinanceIconName,
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
          <span className="finance-module-nav__icon">
            <FinanceIcon name={item.icon} size={16} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
