import { NavLink } from "react-router-dom";
import { AppIcon } from "../../../../../../design-system/AppIcon";
import { useLanguage } from "../../../../../../store/language-context";

export function ChatModuleNav() {
  const { language } = useLanguage();
  const items = [
    {
      to: "/tenant-portal/chat",
      label: language === "es" ? "Resumen" : "Overview",
      icon: "chat" as const,
    },
    {
      to: "/tenant-portal/chat/conversations",
      label: language === "es" ? "Conversaciones" : "Conversations",
      icon: "chat" as const,
    },
    {
      to: "/tenant-portal/chat/activity",
      label: language === "es" ? "Actividad" : "Activity",
      icon: "activity" as const,
    },
  ];

  return (
    <div className="chat-module-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/tenant-portal/chat"}
          className={({ isActive }) =>
            `chat-module-nav__link${isActive ? " is-active" : ""}`
          }
        >
          <span className="chat-module-nav__icon">
            <AppIcon name={item.icon} size={16} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
