import type { RouteObject } from "react-router-dom";
import "../crm/styles/crm.css";

export const productsTenantPortalRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const module = await import("./pages/ProductsOverviewPage");
      return { Component: module.ProductsOverviewPage };
    },
  },
  {
    path: "catalog",
    lazy: async () => {
      const module = await import("./pages/ProductsCatalogPage");
      return { Component: module.ProductsCatalogPage };
    },
  },
  {
    path: "ingestion",
    lazy: async () => {
      const module = await import("./pages/ProductsIngestionPage");
      return { Component: module.ProductsIngestionPage };
    },
  },
  {
    path: "sources",
    lazy: async () => {
      const module = await import("./pages/ProductsSourcesPage");
      return { Component: module.ProductsSourcesPage };
    },
  },
  {
    path: "connectors",
    lazy: async () => {
      const module = await import("./pages/ProductsConnectorsPage");
      return { Component: module.ProductsConnectorsPage };
    },
  },
];
