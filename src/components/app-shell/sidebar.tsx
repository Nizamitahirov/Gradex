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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, GradexMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/structure", label: "Grade Structure", icon: Grid3x3 },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/families", label: "Families", icon: FolderTree },
  { href: "/scoping", label: "Scoping", icon: Target },
];

const SETTINGS_NAV = [{ href: "/settings/organization", label: "Settings", icon: Settings }];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  const renderItem = (item: (typeof NAV)[number]) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen sticky top-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
        <Link href="/dashboard" aria-label="Gradex home">
          {collapsed ? <GradexMark className="size-6" /> : <Logo />}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">{NAV.map(renderItem)}</nav>

      <div className="space-y-1 border-t border-sidebar-border p-3">
        {SETTINGS_NAV.map(renderItem)}
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
