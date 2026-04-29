import { NavLink } from "react-router-dom";
import { AppIcon } from "../../../../../../design-system/AppIcon";
import { useLanguage } from "../../../../../../store/language-context";
import { useTenantAuth } from "../../../../../../store/tenant-auth-context";
import { getTenantPermissionSet } from "../../../../utils/tenant-permissions";

export function TaskOpsModuleNav() {
  const { language } = useLanguage();
  const { tenantUser } = useTenantAuth();
  const permissionSet = getTenantPermissionSet(tenantUser);
  const canAssignOthers =
    permissionSet.has("tenant.taskops.assign_others") ||
    permissionSet.has("tenant.taskops.manage");
  const items = [
    {
      to: "/tenant-portal/taskops",
      label: language === "es" ? "Resumen" : "Overview",
      icon: "taskops" as const,
    },
    {
      to: "/tenant-portal/taskops/tasks",
      label:
        language === "es"
          ? canAssignOthers
            ? "Asignación"
            : "Mis tareas"
          : canAssignOthers
            ? "Assignment"
            : "My tasks",
      icon: "taskops" as const,
    },
    {
      to: "/tenant-portal/taskops/kanban",
      label: language === "es" ? "Kanban" : "Kanban",
      icon: "pipeline" as const,
    },
    {
      to: "/tenant-portal/taskops/history",
      label: language === "es" ? "Histórico" : "History",
      icon: "tenant-history" as const,
    },
  ];

  return (
    <div className="taskops-module-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/tenant-portal/taskops"}
          className={({ isActive }) =>
            `taskops-module-nav__link${isActive ? " is-active" : ""}`
          }
        >
          <span className="taskops-module-nav__icon">
            <AppIcon name={item.icon} size={16} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
