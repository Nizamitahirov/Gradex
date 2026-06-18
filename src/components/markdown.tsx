import * as React from "react";

/** Minimal, safe Markdown renderer for AI-generated JDs (headings, bold, lists). */
export function Markdown({ content }: { content: string }) {
  const blocks = React.useMemo(() => content.replace(/\r/g, "").split("\n"), [content]);
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flush = (key: number) => {
    if (list.length) {
      out.push(
        <ul key={`ul-${key}`} className="my-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  blocks.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) {
      flush(i);
      out.push(<h4 key={i} className="mt-4 text-sm font-semibold">{inline(line.replace(/^###\s+/, ""))}</h4>);
    } else if (/^##\s+/.test(line)) {
      flush(i);
      out.push(<h3 key={i} className="mt-5 text-base font-bold tracking-tight">{inline(line.replace(/^##\s+/, ""))}</h3>);
    } else if (/^#\s+/.test(line)) {
      flush(i);
      out.push(<h2 key={i} className="mt-5 text-lg font-extrabold tracking-tight">{inline(line.replace(/^#\s+/, ""))}</h2>);
    } else if (/^\s*[-*]\s+/.test(line)) {
      list.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flush(i);
    } else {
      flush(i);
      out.push(<p key={i} className="my-2 text-sm leading-relaxed">{inline(line)}</p>);
    }
  });
  flush(blocks.length);

  return <div className="space-y-0.5">{out}</div>;
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p) ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>,
  );
}
