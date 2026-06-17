"use client";

import { gradeColor } from "@/lib/grade-colors";
import { cn } from "@/lib/utils";

/** Shows where an org sits on the 1–25 scale, highlighting the used range. */
export function ScaleVisual({
  bottom,
  top,
  ceo,
  className,
}: {
  bottom: number;
  top: number;
  ceo?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end gap-[3px]">
        {Array.from({ length: 25 }, (_, i) => i + 1).map((g) => {
          const inRange = g >= bottom && g <= top;
          const isCeo = g === ceo;
          return (
            <div key={g} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "w-full rounded-sm transition-all",
                  inRange ? "opacity-100" : "opacity-20",
                )}
                style={{
                  height: 10 + g * 2.2,
                  backgroundColor: inRange ? gradeColor(g).solid : "var(--muted-foreground)",
                  outline: isCeo ? "2px solid var(--primary)" : undefined,
                  outlineOffset: 1,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground tnum">
        <span>1</span>
        <span>13</span>
        <span>25</span>
      </div>
    </div>
  );
}
