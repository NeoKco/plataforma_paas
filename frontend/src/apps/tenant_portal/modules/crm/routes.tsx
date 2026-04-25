import type { RouteObject } from "react-router-dom";
import "./styles/crm.css";

export const crmTenantPortalRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const module = await import("./pages/CRMOverviewPage");
      return { Component: module.CRMOverviewPage };
    },
  },
  {
    path: "opportunities",
    lazy: async () => {
      const module = await import("./pages/CRMOpportunitiesPage");
      return { Component: module.CRMOpportunitiesPage };
    },
  },
  {
    path: "history",
    lazy: async () => {
      const module = await import("./pages/CRMHistoryPage");
      return { Component: module.CRMHistoryPage };
    },
  },
  {
    path: "quotes",
    lazy: async () => {
      const module = await import("./pages/CRMQuotesPage");
      return { Component: module.CRMQuotesPage };
    },
  },
  {
    path: "templates",
    lazy: async () => {
      const module = await import("./pages/CRMTemplatesPage");
      return { Component: module.CRMTemplatesPage };
    },
  },
];
