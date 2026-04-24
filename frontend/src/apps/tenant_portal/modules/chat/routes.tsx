import type { RouteObject } from "react-router-dom";
import "./styles/chat.css";

export const chatTenantPortalRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const module = await import("./pages/ChatOverviewPage");
      return { Component: module.ChatOverviewPage };
    },
  },
  {
    path: "conversations",
    lazy: async () => {
      const module = await import("./pages/ChatConversationsPage");
      return { Component: module.ChatConversationsPage };
    },
  },
  {
    path: "activity",
    lazy: async () => {
      const module = await import("./pages/ChatActivityPage");
      return { Component: module.ChatActivityPage };
    },
  },
];
