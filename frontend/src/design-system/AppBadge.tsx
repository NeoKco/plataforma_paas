import type { ReactNode } from "react";

export type AppBadgeTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "neutral";

type AppBadgeProps = {
  tone?: AppBadgeTone;
  children: ReactNode;
  className?: string;
};

export function AppBadge({
  tone = "neutral",
  children,
  className,
}: AppBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}${className ? ` ${className}` : ""}`}>
      {children}
    </span>
  );
}
