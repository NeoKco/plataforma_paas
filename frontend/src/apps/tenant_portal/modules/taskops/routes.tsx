import type { RouteObject } from "react-router-dom";
import "./styles/taskops.css";

export const taskopsTenantPortalRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const module = await import("./pages/TaskOpsOverviewPage");
      return { Component: module.TaskOpsOverviewPage };
    },
  },
  {
    path: "tasks",
    lazy: async () => {
      const module = await import("./pages/TaskOpsTasksPage");
      return { Component: module.TaskOpsTasksPage };
    },
  },
  {
    path: "kanban",
    lazy: async () => {
      const module = await import("./pages/TaskOpsKanbanPage");
      return { Component: module.TaskOpsKanbanPage };
    },
  },
  {
    path: "history",
    lazy: async () => {
      const module = await import("./pages/TaskOpsHistoryPage");
      return { Component: module.TaskOpsHistoryPage };
    },
  },
];
