import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../store/auth-context";
import {
  getPlatformDefaultRoute,
  normalizePlatformAdminRole,
} from "../access/platformRoleAccess";

type RequirePlatformRolesProps = {
  allowedRoles: string[];
  redirectTo?: string;
};

export function RequirePlatformRoles({
  allowedRoles,
  redirectTo,
}: RequirePlatformRolesProps) {
  const { session } = useAuth();
  const currentRole = normalizePlatformAdminRole(session?.role);

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to={redirectTo || getPlatformDefaultRoute(currentRole)} replace />;
  }

  return <Outlet />;
}
