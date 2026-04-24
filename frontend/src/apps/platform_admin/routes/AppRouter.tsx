import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import { RequireInstalled } from "./RequireInstalled";
import { RequireNotInstalled } from "./RequireNotInstalled";
import { RequirePlatformRoles } from "./RequirePlatformRoles";
import { businessCoreTenantPortalRoutes } from "../../tenant_portal/modules/business_core";
import { crmTenantPortalRoutes } from "../../tenant_portal/modules/crm";
import { financeTenantPortalRoutes } from "../../tenant_portal/modules/finance";
import { maintenanceTenantPortalRoutes } from "../../tenant_portal/modules/maintenance";
import { taskopsTenantPortalRoutes } from "../../tenant_portal/modules/taskops";
import { RequireTenantAuth } from "../../tenant_portal/routes/RequireTenantAuth";
import { LoadingBlock } from "../../../components/feedback/LoadingBlock";
import { useAuth } from "../../../store/auth-context";
import { getPlatformDefaultRoute } from "../access/platformRoleAccess";

const router = createBrowserRouter([
  {
    path: "/install",
    lazy: async () => {
      const module = await import("../pages/install/InstallPage");
      return {
        element: (
          <RequireNotInstalled>
            <module.InstallPage />
          </RequireNotInstalled>
        ),
      };
    },
  },
  {
    path: "/login",
    lazy: async () => {
      const module = await import("../pages/auth/LoginPage");
      return {
        element: (
          <RequireInstalled>
            <module.LoginPage />
          </RequireInstalled>
        ),
      };
    },
  },
  {
    path: "/login/root-recovery",
    lazy: async () => {
      const module = await import("../pages/auth/PlatformRootRecoveryPage");
      return {
        element: (
          <RequireInstalled>
            <module.PlatformRootRecoveryPage />
          </RequireInstalled>
        ),
      };
    },
  },
  {
    path: "/",
    element: (
      <RequireInstalled>
        <RequireAuth />
      </RequireInstalled>
    ),
    children: [
      {
        index: true,
        lazy: async () => {
          const module = await import("../pages/dashboard/DashboardPage");

          function PlatformHomeRoute() {
            const { session } = useAuth();
            const homeRoute = getPlatformDefaultRoute(session?.role);
            if (homeRoute !== "/") {
              return <Navigate to={homeRoute} replace />;
            }
            return <module.DashboardPage />;
          }

          return { Component: PlatformHomeRoute };
        },
      },
      {
        element: <RequirePlatformRoles allowedRoles={["superadmin", "admin"]} />,
        children: [
          {
            path: "activity",
            lazy: async () => {
              const module = await import("../pages/activity/PlatformActivityPage");
              return { Component: module.PlatformActivityPage };
            },
          },
        ],
      },
      {
        path: "users",
        lazy: async () => {
          const module = await import("../pages/users/PlatformUsersPage");
          return { Component: module.PlatformUsersPage };
        },
      },
      {
        element: <RequirePlatformRoles allowedRoles={["superadmin"]} />,
        children: [
          {
            path: "tenants",
            lazy: async () => {
              const module = await import("../pages/tenants/TenantsPage");
              return { Component: module.TenantsPage };
            },
          },
          {
            path: "tenant-history",
            lazy: async () => {
              const module = await import("../pages/tenant_history/TenantHistoryPage");
              return { Component: module.TenantHistoryPage };
            },
          },
          {
            path: "provisioning",
            lazy: async () => {
              const module = await import("../pages/provisioning/ProvisioningPage");
              return { Component: module.ProvisioningPage };
            },
          },
          {
            path: "billing",
            lazy: async () => {
              const module = await import("../pages/billing/BillingPage");
              return { Component: module.BillingPage };
            },
          },
          {
            path: "settings",
            lazy: async () => {
              const module = await import("../pages/settings/SettingsPage");
              return { Component: module.SettingsPage };
            },
          },
        ],
      },
    ],
  },
  {
    path: "/tenant-portal/login",
    lazy: async () => {
      const module = await import("../../tenant_portal/pages/auth/TenantLoginPage");
      return {
        element: (
          <RequireInstalled>
            <module.TenantLoginPage />
          </RequireInstalled>
        ),
      };
    },
  },
  {
    path: "/tenant-portal",
    element: (
      <RequireInstalled>
        <RequireTenantAuth />
      </RequireInstalled>
    ),
    children: [
      {
        index: true,
        lazy: async () => {
          const module = await import("../../tenant_portal/pages/overview/TenantOverviewPage");
          return { Component: module.TenantOverviewPage };
        },
      },
      {
        path: "users",
        lazy: async () => {
          const module = await import("../../tenant_portal/pages/users/TenantUsersPage");
          return { Component: module.TenantUsersPage };
        },
      },
      {
        path: "business-core",
        children: businessCoreTenantPortalRoutes,
      },
      {
        path: "finance",
        children: financeTenantPortalRoutes,
      },
      {
        path: "crm",
        children: crmTenantPortalRoutes,
      },
      {
        path: "taskops",
        children: taskopsTenantPortalRoutes,
      },
      {
        path: "agenda",
        lazy: async () => {
          const module = await import("../../tenant_portal/pages/agenda/TenantAgendaPage");
          return { Component: module.TenantAgendaPage };
        },
      },
      {
        path: "maintenance",
        children: maintenanceTenantPortalRoutes,
      },
    ],
  },
]);

export function AppRouter() {
  return (
    <RouterProvider
      router={router}
      fallbackElement={<LoadingBlock label="Loading workspace..." />}
    />
  );
}
