"use client";

import * as React from "react";
import { BookOpen, FileText } from "lucide-react";
import type { PdfRef } from "@/lib/grading/references";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Shows a short PDF citation for a GGS element plus a "view detailed reference"
 * button that opens the underlying principle from the WTW GGS 4.2 guide.
 */
export function PdfReference({ reference, className }: { reference: PdfRef; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          <FileText className="size-2.5" /> {reference.cite}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
        >
          İstinada ətraflı bax
        </button>
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-primary" /> {reference.section}
            </DialogTitle>
            <DialogDescription>{reference.cite}</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed">
            {reference.detail}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Mənbə: WTW Global Grading System 4.2 User Guide. Yalnız istinad üçün qısa izahdır.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
