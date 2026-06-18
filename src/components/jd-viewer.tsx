"use client";

import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Markdown } from "@/components/markdown";

/** Read a stored JD (markdown or parsed text/HTML) inside the platform. */
export function JDViewer({
  open,
  onOpenChange,
  title,
  jd,
  html,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  jd: string;
  html?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>
        {html ? (
          <div
            className="prose-sm max-w-none text-sm [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:font-bold [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : jd?.trim() ? (
          <Markdown content={jd} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No job description on file.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
