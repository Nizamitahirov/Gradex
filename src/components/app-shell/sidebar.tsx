"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Grid3x3,
  Briefcase,
  FolderTree,
  Settings,
  Target,
  ChartColumnBig,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, GradexMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

const NAV_MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/structure", label: "Grade Structure", icon: Grid3x3 },
  { href: "/analytics", label: "Analytics", icon: ChartColumnBig },
];

const NAV_MANAGE = [
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/families", label: "Families", icon: FolderTree },
  { href: "/scoping", label: "Scoping", icon: Target },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  const renderItem = (item: { href: string; label: string; icon: typeof Briefcase }) => {
    const active =
      pathname === item.href ||
      pathname.startsWith(item.href + "/") ||
      (item.href.startsWith("/settings") && pathname.startsWith("/settings"));
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-[13px] font-semibold transition-all",
          active
            ? "bg-primary text-primary-foreground"
            : "text-secondary-foreground hover:bg-sidebar-accent",
          collapsed && "justify-center px-0",
        )}
        style={active ? { boxShadow: "var(--shadow-glow)" } : undefined}
      >
        <Icon className={cn("size-[18px] shrink-0", !active && "text-muted-foreground")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen sticky top-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[72px] px-2 py-4" : "w-[248px] px-3 py-4",
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border px-1 pb-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Link href="/dashboard" aria-label="Gradex home">
          {collapsed ? <GradexMark className="size-9" /> : <Logo />}
        </Link>
      </div>

      <nav className="mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {!collapsed && <SectionLabel>Overview</SectionLabel>}
        {NAV_MAIN.map(renderItem)}
        {!collapsed && <SectionLabel className="mt-2">Manage</SectionLabel>}
        {NAV_MANAGE.map(renderItem)}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border pt-3">
        {renderItem({ href: "/settings/organization", label: "Settings", icon: Settings })}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn("mt-1 w-full text-muted-foreground", collapsed ? "justify-center px-0" : "justify-start")}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("px-2 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground/70", className)}>
      {children}
    </p>
  );
}
