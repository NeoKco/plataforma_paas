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
    path: "clients/:clientId",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreClientDetailPage");
      return { Component: module.BusinessCoreClientDetailPage };
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
    path: "function-profiles",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreFunctionProfilesPage");
      return { Component: module.BusinessCoreFunctionProfilesPage };
    },
  },
  {
    path: "work-groups",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreWorkGroupsPage");
      return { Component: module.BusinessCoreWorkGroupsPage };
    },
  },
  {
    path: "task-types",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreTaskTypesPage");
      return { Component: module.BusinessCoreTaskTypesPage };
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
