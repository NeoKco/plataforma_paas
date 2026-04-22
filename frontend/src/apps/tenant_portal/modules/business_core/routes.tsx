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
    path: "social-community-groups",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreSocialCommunityGroupsPage");
      return { Component: module.BusinessCoreSocialCommunityGroupsPage };
    },
  },
  {
    path: "common-organization-name",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreCommonOrganizationNamePage");
      return { Component: module.BusinessCoreCommonOrganizationNamePage };
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
    path: "duplicates",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreDuplicatesPage");
      return { Component: module.BusinessCoreDuplicatesPage };
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
    path: "asset-types",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreAssetTypesPage");
      return { Component: module.BusinessCoreAssetTypesPage };
    },
  },
  {
    path: "assets",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreAssetsPage");
      return { Component: module.BusinessCoreAssetsPage };
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
    path: "work-groups/:workGroupId/members",
    lazy: async () => {
      const module = await import("./pages/BusinessCoreWorkGroupMembersPage");
      return { Component: module.BusinessCoreWorkGroupMembersPage };
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
