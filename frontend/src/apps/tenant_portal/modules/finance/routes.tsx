import type { RouteObject } from "react-router-dom";
import "./styles/finance.css";

export const financeTenantPortalRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const module = await import("./pages/FinanceTransactionsPage");
      return { Component: module.FinanceTransactionsPage };
    },
  },
  {
    path: "dashboard",
    lazy: async () => {
      const module = await import("./pages/FinanceDashboardPage");
      return { Component: module.FinanceDashboardPage };
    },
  },
  {
    path: "transactions",
    lazy: async () => {
      const module = await import("./pages/FinanceTransactionsPage");
      return { Component: module.FinanceTransactionsPage };
    },
  },
  {
    path: "accounts",
    lazy: async () => {
      const module = await import("./pages/FinanceAccountsPage");
      return { Component: module.FinanceAccountsPage };
    },
  },
  {
    path: "categories",
    lazy: async () => {
      const module = await import("./pages/FinanceCategoriesPage");
      return { Component: module.FinanceCategoriesPage };
    },
  },
  {
    path: "calendar",
    lazy: async () => {
      const module = await import("./pages/FinanceCalendarPage");
      return { Component: module.FinanceCalendarPage };
    },
  },
  {
    path: "reports",
    lazy: async () => {
      const module = await import("./pages/FinanceReportsPage");
      return { Component: module.FinanceReportsPage };
    },
  },
  {
    path: "profit-loss",
    lazy: async () => {
      const module = await import("./pages/FinanceProfitLossPage");
      return { Component: module.FinanceProfitLossPage };
    },
  },
  {
    path: "loans",
    lazy: async () => {
      const module = await import("./pages/FinanceLoansPage");
      return { Component: module.FinanceLoansPage };
    },
  },
  {
    path: "budgets",
    lazy: async () => {
      const module = await import("./pages/FinanceBudgetsPage");
      return { Component: module.FinanceBudgetsPage };
    },
  },
  {
    path: "settings",
    lazy: async () => {
      const module = await import("./pages/FinanceSettingsPage");
      return { Component: module.FinanceSettingsPage };
    },
  },
  {
    path: "tools",
    lazy: async () => {
      const module = await import("./pages/FinanceToolsPage");
      return { Component: module.FinanceToolsPage };
    },
  },
];
