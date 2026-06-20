"use client";

import * as React from "react";
import { Building2, Check, ChevronsUpDown, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { useCompanyScope } from "@/hooks/use-org-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function CompanySwitcher() {
  const { data, setActiveCompany } = useCompanyScope();
  const companies = data?.companies ?? [];
  const scope = data?.scope ?? null;
  const multi = companies.length > 1;

  const activeName =
    scope === "all"
      ? "All companies"
      : companies.find((c) => c.id === scope)?.name ?? companies[0]?.name ?? "Gradex";

  if (companies.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm font-medium">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="max-w-[160px] truncate">Gradex</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
          {scope === "all" ? <Layers className="size-4 text-primary" /> : <Building2 className="size-4 text-muted-foreground" />}
          <span className="max-w-[160px] truncate">{activeName}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Companies</DropdownMenuLabel>
        {multi && (
          <DropdownMenuItem onClick={() => setActiveCompany("all")} className="gap-2">
            <Layers className="size-4 text-primary" />
            <span className="flex-1">All companies</span>
            {scope === "all" && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        )}
        {companies.map((c) => (
          <DropdownMenuItem key={c.id} onClick={() => setActiveCompany(c.id)} className="gap-2">
            <Building2 className={cn("size-4", scope === c.id ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1 truncate">{c.name}</span>
            {scope === c.id && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/companies" className="gap-2">
            <Plus className="size-4" /> Manage companies
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
