import { cn } from "@/lib/utils";

/** Gradex wordmark — Birtask-style gradient mark + bold Montserrat wordmark. */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <GradexMark className="size-9" />
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-extrabold tracking-tight">Gradex</span>
          <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">Job leveling</span>
        </span>
      )}
    </span>
  );
}

/** Gradient rounded-square mark with an ascending grade glyph and soft glow. */
export function GradexMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-[10px] text-white", className)}
      style={{
        background: "linear-gradient(135deg, #6E6CFF, #B57BFF 60%, #FF6FB0)",
        boxShadow: "var(--shadow-glow)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[60%]" aria-hidden="true">
        <rect x="3" y="13" width="4" height="8" rx="1.5" fill="currentColor" opacity="0.7" />
        <rect x="10" y="8" width="4" height="13" rx="1.5" fill="currentColor" opacity="0.88" />
        <rect x="17" y="3" width="4" height="18" rx="1.5" fill="currentColor" />
      </svg>
    </span>
  );
}
