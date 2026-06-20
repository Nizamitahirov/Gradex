"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Search, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { CompanySwitcher } from "@/components/app-shell/company-switcher";
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
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = React.useState(false);

  const displayName = user?.displayName ?? "User";
  const userEmail = user?.email ?? user?.username ?? "";

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
      {/* Active company */}
      <CompanySwitcher />

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
              <AvatarFallback>{initials(displayName)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-medium">{displayName}</div>
            <div className="text-xs font-normal text-muted-foreground">{userEmail}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/profile">
              <User className="size-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
