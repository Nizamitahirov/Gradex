import { cn } from "@/lib/utils";

/** Gradex wordmark with an ascending-bar grade glyph (SPEC.md §4.1). */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <GradexMark className="size-6" />
      {showText && (
        <span className="text-lg font-semibold tracking-tight">Gradex</span>
      )}
    </span>
  );
}

export function GradexMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="14" width="4" height="8" rx="1.5" fill="currentColor" className="text-primary" opacity="0.55" />
      <rect x="8.5" y="9" width="4" height="13" rx="1.5" fill="currentColor" className="text-primary" opacity="0.78" />
      <rect x="15" y="3" width="4" height="19" rx="1.5" fill="currentColor" className="text-primary" />
    </svg>
  );
}
