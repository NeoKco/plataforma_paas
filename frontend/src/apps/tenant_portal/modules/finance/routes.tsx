import type { RouteObject } from "react-router-dom";
import "./styles/finance.css";
import { FinanceAccountsPage } from "./pages/FinanceAccountsPage";
import { FinanceBudgetsPage } from "./pages/FinanceBudgetsPage";
import { FinanceCalendarPage } from "./pages/FinanceCalendarPage";
import { FinanceCategoriesPage } from "./pages/FinanceCategoriesPage";
import { FinanceDashboardPage } from "./pages/FinanceDashboardPage";
import { FinanceLoansPage } from "./pages/FinanceLoansPage";
import { FinanceProfitLossPage } from "./pages/FinanceProfitLossPage";
import { FinanceReportsPage } from "./pages/FinanceReportsPage";
import { FinanceSettingsPage } from "./pages/FinanceSettingsPage";
import { FinanceToolsPage } from "./pages/FinanceToolsPage";
import { FinanceTransactionsPage } from "./pages/FinanceTransactionsPage";

export const financeTenantPortalRoutes: RouteObject[] = [
  { index: true, element: <FinanceTransactionsPage /> },
  { path: "dashboard", element: <FinanceDashboardPage /> },
  { path: "transactions", element: <FinanceTransactionsPage /> },
  { path: "accounts", element: <FinanceAccountsPage /> },
  { path: "categories", element: <FinanceCategoriesPage /> },
  { path: "calendar", element: <FinanceCalendarPage /> },
  { path: "reports", element: <FinanceReportsPage /> },
  { path: "profit-loss", element: <FinanceProfitLossPage /> },
  { path: "loans", element: <FinanceLoansPage /> },
  { path: "budgets", element: <FinanceBudgetsPage /> },
  { path: "settings", element: <FinanceSettingsPage /> },
  { path: "tools", element: <FinanceToolsPage /> },
];
