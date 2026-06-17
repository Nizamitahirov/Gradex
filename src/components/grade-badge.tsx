"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { gradeColor } from "@/lib/grade-colors";

interface GradeBadgeProps {
  grade: number | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "h-6 min-w-6 px-1.5 text-xs",
  md: "h-7 min-w-7 px-2 text-sm",
  lg: "h-10 min-w-10 px-3 text-lg",
  xl: "h-16 min-w-16 px-4 text-3xl",
};

/** A grade rendered as a color-ramped, tabular-figure badge — recognizable anywhere. */
export function GradeBadge({ grade, size = "md", className }: GradeBadgeProps) {
  if (grade == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-dashed border-border font-semibold text-muted-foreground tnum",
          SIZES[size],
          className,
        )}
      >
        —
      </span>
    );
  }
  const c = gradeColor(grade);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold tnum shadow-sm",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: c.solid, color: c.foreground }}
    >
      {grade}
    </span>
  );
}
