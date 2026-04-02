import type { RouteObject } from "react-router-dom";
import "./styles/business-core.css";

export const businessCoreTenantPortalRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const module = await import("./pages/BusinessCoreOverviewPage");
      return { Component: module.BusinessCoreOverviewPage };
    },
  },
  {
    path: "organizations",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreOrganizationsPage");
      return { Component: module.BusinessCoreOrganizationsPage };
    },
  },
  {
    path: "clients",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreClientsPage");
      return { Component: module.BusinessCoreClientsPage };
    },
  },
  {
    path: "contacts",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreContactsPage");
      return { Component: module.BusinessCoreContactsPage };
    },
  },
  {
    path: "sites",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreSitesPage");
      return { Component: module.BusinessCoreSitesPage };
    },
  },
  {
    path: "taxonomy",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreTaxonomyPage");
      return { Component: module.BusinessCoreTaxonomyPage };
    },
  },
];
