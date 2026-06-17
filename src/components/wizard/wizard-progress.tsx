"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function WizardProgress({
  steps,
  current,
  onStepClick,
}: {
  steps: string[];
  current: number;
  onStepClick?: (i: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!onStepClick || i > current}
              onClick={() => onStepClick?.(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                active && "bg-primary/10 text-primary",
                done && "text-foreground",
                !active && !done && "text-muted-foreground",
                onStepClick && i <= current && "hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-[10px] tnum",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-success bg-success text-success-foreground",
                  !active && !done && "border-border",
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < steps.length - 1 && <span className="h-px w-4 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
