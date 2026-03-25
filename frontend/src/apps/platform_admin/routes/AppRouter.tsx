import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { LoginPage } from "../pages/auth/LoginPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { TenantsPage } from "../pages/tenants/TenantsPage";
import { ProvisioningPage } from "../pages/provisioning/ProvisioningPage";
import { BillingPage } from "../pages/billing/BillingPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { InstallPage } from "../pages/install/InstallPage";
import { PlatformUsersPage } from "../pages/users/PlatformUsersPage";
import { RequireAuth } from "./RequireAuth";
import { RequireInstalled } from "./RequireInstalled";
import { RequireTenantAuth } from "../../tenant_portal/routes/RequireTenantAuth";
import { TenantLoginPage } from "../../tenant_portal/pages/auth/TenantLoginPage";
import { TenantOverviewPage } from "../../tenant_portal/pages/overview/TenantOverviewPage";
import { TenantUsersPage } from "../../tenant_portal/pages/users/TenantUsersPage";
import { TenantFinancePage } from "../../tenant_portal/pages/finance/TenantFinancePage";
import { useAuth } from "../../../store/auth-context";

function PlatformHomeRoute() {
  const { session } = useAuth();
  if (session?.role === "admin" || session?.role === "support") {
    return <Navigate to="/users" replace />;
  }
  return <DashboardPage />;
}

const router = createBrowserRouter([
  {
    path: "/install",
    element: <InstallPage />,
  },
  {
    path: "/login",
    element: (
      <RequireInstalled>
        <LoginPage />
      </RequireInstalled>
    ),
  },
  {
    path: "/",
    element: (
      <RequireInstalled>
        <RequireAuth />
      </RequireInstalled>
    ),
    children: [
      { index: true, element: <PlatformHomeRoute /> },
      { path: "users", element: <PlatformUsersPage /> },
      { path: "tenants", element: <TenantsPage /> },
      { path: "provisioning", element: <ProvisioningPage /> },
      { path: "billing", element: <BillingPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "/tenant-portal/login",
    element: (
      <RequireInstalled>
        <TenantLoginPage />
      </RequireInstalled>
    ),
  },
  {
    path: "/tenant-portal",
    element: (
      <RequireInstalled>
        <RequireTenantAuth />
      </RequireInstalled>
    ),
    children: [
      { index: true, element: <TenantOverviewPage /> },
      { path: "users", element: <TenantUsersPage /> },
      { path: "finance", element: <TenantFinancePage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
