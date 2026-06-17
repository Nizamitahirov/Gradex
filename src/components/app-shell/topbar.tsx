"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LogOut, Search, User, Building2, RotateCcw } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { DEMO_USER } from "@/lib/demo/seed";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { GlobalSearch } from "@/components/app-shell/global-search";

export function Topbar() {
  const orgs = useAppStore((s) => s.orgs);
  const currentOrgId = useAppStore((s) => s.currentOrgId);
  const setCurrentOrg = useAppStore((s) => s.setCurrentOrg);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const router = useRouter();
  const [searchOpen, setSearchOpen] = React.useState(false);

  const currentOrg = orgs.find((o) => o.id === currentOrgId);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Org switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-2">
            <Building2 className="size-4" />
            <span className="max-w-[140px] truncate">{currentOrg?.name ?? "Select org"}</span>
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {orgs.map((o) => (
            <DropdownMenuItem key={o.id} onClick={() => setCurrentOrg(o.id)}>
              <Building2 className="size-4" />
              <span className="flex-1 truncate">{o.name}</span>
              {o.id === currentOrgId && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 text-muted-foreground sm:flex"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="size-4" />
        <span>Search…</span>
        <kbd className="ml-2 rounded border border-border bg-muted px-1.5 text-[10px] font-medium">⌘K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
        <Search className="size-4" />
      </Button>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="User menu">
            <Avatar className="size-8">
              <AvatarFallback>{initials(DEMO_USER.displayName)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-medium">{DEMO_USER.displayName}</div>
            <div className="text-xs font-normal text-muted-foreground">{DEMO_USER.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">
              <User className="size-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => resetDemo()}>
            <RotateCcw className="size-4" /> Reset demo data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/")}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
