"use client";

import * as React from "react";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { useAppStore } from "@/stores/app-store";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const ensureSeeded = useAppStore((s) => s.ensureSeeded);
  const [collapsed, setCollapsed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    ensureSeeded();
    setHydrated(true);
    const stored = localStorage.getItem("gradex-sidebar-collapsed");
    if (stored) setCollapsed(stored === "1");
  }, [ensureSeeded]);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("gradex-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {hydrated ? children : null}
        </main>
      </div>
    </div>
  );
}
