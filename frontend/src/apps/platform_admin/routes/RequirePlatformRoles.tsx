import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../store/auth-context";

type RequirePlatformRolesProps = {
  allowedRoles: string[];
  redirectTo?: string;
};

export function RequirePlatformRoles({
  allowedRoles,
  redirectTo = "/users",
}: RequirePlatformRolesProps) {
  const { session } = useAuth();
  const currentRole = session?.role || "support";

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
