import type { ReactNode } from "react";

type AppToolbarProps = {
  children: ReactNode;
  compact?: boolean;
  className?: string;
};

type AppFilterGridProps = {
  children: ReactNode;
  className?: string;
};

type AppTableWrapProps = {
  children: ReactNode;
  className?: string;
};

export function AppToolbar({
  children,
  compact = false,
  className,
}: AppToolbarProps) {
  const compactClass = compact ? " app-toolbar--compact" : "";
  const extraClass = className ? ` ${className}` : "";
  return <div className={`app-toolbar${compactClass}${extraClass}`}>{children}</div>;
}

export function AppFilterGrid({
  children,
  className,
}: AppFilterGridProps) {
  const extraClass = className ? ` ${className}` : "";
  return <div className={`app-filter-grid${extraClass}`}>{children}</div>;
}

export function AppTableWrap({
  children,
  className,
}: AppTableWrapProps) {
  const extraClass = className ? ` ${className}` : "";
  return <div className={`table-responsive app-table-wrap${extraClass}`}>{children}</div>;
}
