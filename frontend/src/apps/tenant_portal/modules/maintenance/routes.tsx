import type { RouteObject } from "react-router-dom";
import "./styles/maintenance.css";

export const maintenanceTenantPortalRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const module = await import("./pages/MaintenanceOverviewPage");
      return { Component: module.MaintenanceOverviewPage };
    },
  },
  {
    path: "due-items",
    lazy: async () => {
      const module = await import("./pages/MaintenanceDueItemsPage");
      return { Component: module.MaintenanceDueItemsPage };
    },
  },
  {
    path: "work-orders",
    lazy: async () => {
      const module = await import("./pages/MaintenanceWorkOrdersPage");
      return { Component: module.MaintenanceWorkOrdersPage };
    },
  },
  {
    path: "installations",
    lazy: async () => {
      const module = await import("./pages/MaintenanceInstallationsPage");
      return { Component: module.MaintenanceInstallationsPage };
    },
  },
  {
    path: "equipment-types",
    lazy: async () => {
      const module = await import("./pages/MaintenanceEquipmentTypesPage");
      return { Component: module.MaintenanceEquipmentTypesPage };
    },
  },
  {
    path: "cost-templates",
    lazy: async () => {
      const module = await import("./pages/MaintenanceCostTemplatesPage");
      return { Component: module.MaintenanceCostTemplatesPage };
    },
  },
  {
    path: "history",
    lazy: async () => {
      const module = await import("./pages/MaintenanceHistoryPage");
      return { Component: module.MaintenanceHistoryPage };
    },
  },
  {
    path: "calendar",
    lazy: async () => {
      const module = await import("./pages/MaintenanceCalendarPage");
      return { Component: module.MaintenanceCalendarPage };
    },
  },
  {
    path: "reports",
    lazy: async () => {
      const module = await import("./pages/MaintenanceReportsPage");
      return { Component: module.MaintenanceReportsPage };
    },
  },
];
