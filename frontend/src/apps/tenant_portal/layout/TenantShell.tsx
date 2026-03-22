import type { ReactNode } from "react";
import { TenantSidebarNav } from "./TenantSidebarNav";
import { TenantTopbar } from "./TenantTopbar";

export function TenantShell({ children }: { children: ReactNode }) {
  return (
    <div className="platform-shell">
      <TenantSidebarNav />
      <div className="platform-shell__main">
        <TenantTopbar />
        <main className="platform-shell__content">{children}</main>
      </div>
    </div>
  );
}
