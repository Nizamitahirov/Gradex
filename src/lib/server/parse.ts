/**
 * Document parsing — extracts text (and HTML where possible) from uploaded
 * PDF, Word (.docx), HTML and plain-text files. Server-only.
 */

import "server-only";

export interface ParsedDoc {
  text: string;
  html: string | null;
  kind: "pdf" | "docx" | "html" | "text";
}

async function parsePdf(buf: Buffer): Promise<string> {
  // unpdf ships a serverless-safe pdf.js build (no DOMMatrix / canvas needed).
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).trim();
}

async function parseDocx(buf: Buffer): Promise<{ text: string; html: string }> {
  const mammoth = await import("mammoth");
  const [{ value: html }, { value: text }] = await Promise.all([
    mammoth.convertToHtml({ buffer: buf }),
    mammoth.extractRawText({ buffer: buf }),
  ]);
  return { text: text.trim(), html };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function parseDocument(buf: Buffer, filename: string, mime: string): Promise<ParsedDoc> {
  const name = filename.toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    return { text: await parsePdf(buf), html: null, kind: "pdf" };
  }
  if (mime.includes("word") || mime.includes("officedocument") || name.endsWith(".docx") || name.endsWith(".doc")) {
    const { text, html } = await parseDocx(buf);
    return { text, html, kind: "docx" };
  }
  if (mime.includes("html") || name.endsWith(".html") || name.endsWith(".htm")) {
    const html = buf.toString("utf8");
    return { text: stripHtml(html), html, kind: "html" };
  }
  return { text: buf.toString("utf8"), html: null, kind: "text" };
}
