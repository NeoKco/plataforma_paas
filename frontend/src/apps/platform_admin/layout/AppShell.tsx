import type { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="platform-shell">
      <SidebarNav />
      <div className="platform-shell__main">
        <Topbar />
        <main className="platform-shell__content">{children}</main>
      </div>
    </div>
  );
}
