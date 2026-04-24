import type { RouteObject } from "react-router-dom";
import "./styles/techdocs.css";

export const techdocsTenantPortalRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const module = await import("./pages/TechDocsOverviewPage");
      return { Component: module.TechDocsOverviewPage };
    },
  },
  {
    path: "dossiers",
    lazy: async () => {
      const module = await import("./pages/TechDocsDossiersPage");
      return { Component: module.TechDocsDossiersPage };
    },
  },
  {
    path: "audit",
    lazy: async () => {
      const module = await import("./pages/TechDocsAuditPage");
      return { Component: module.TechDocsAuditPage };
    },
  },
];
