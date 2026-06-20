import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({ label, value, hint, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div
        className="mt-2 truncate text-2xl font-bold leading-tight tracking-tight tnum"
        title={typeof value === "string" || typeof value === "number" ? String(value) : undefined}
      >
        {value}
      </div>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground" title={hint}>{hint}</p>}
    </Card>
  );
}
