"use client";

import * as React from "react";
import { Users, UserPlus, Briefcase, Plus, Pencil, Link2 } from "lucide-react";
import { buildTree, descendantIds, typeDef, type OrgUnit, type OrgNode, type StructureMode } from "@/lib/org/structure";
import { cn } from "@/lib/utils";

interface Props {
  units: OrgUnit[];
  mode: StructureMode;
  canEdit: boolean;
  positionsFor: (u: OrgUnit) => number;
  onAddChild: (parent: OrgUnit) => void;
  onEdit: (u: OrgUnit) => void;
  onReparent: (id: string, newParentId: string | null) => void;
}

interface LinkLine { id: string; x1: number; y1: number; x2: number; y2: number }

export function OrgChart({ units, mode, canEdit, positionsFor, onAddChild, onEdit, onReparent }: Props) {
  const roots = React.useMemo(() => buildTree(units), [units]);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const nodeRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const [links, setLinks] = React.useState<LinkLine[]>([]);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  const blocked = React.useMemo(() => (dragId ? new Set([dragId, ...descendantIds(units, dragId)]) : new Set<string>()), [dragId, units]);

  // Measure node centers and compute functional (dotted) link coordinates.
  const measure = React.useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wr = wrap.getBoundingClientRect();
    const center = (el: HTMLDivElement) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - wr.left + wrap.scrollLeft + r.width / 2,
        y: r.top - wr.top + wrap.scrollTop + r.height / 2,
      };
    };
    const out: LinkLine[] = [];
    for (const u of units) {
      const from = nodeRefs.current.get(u.id);
      if (!from || !u.functionalLinks?.length) continue;
      const a = center(from);
      for (const t of u.functionalLinks) {
        const toEl = nodeRefs.current.get(t);
        if (!toEl) continue;
        const b = center(toEl);
        out.push({ id: `${u.id}-${t}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    }
    setLinks(out);
    setSize({ w: wrap.scrollWidth, h: wrap.scrollHeight });
  }, [units]);

  React.useLayoutEffect(() => {
    measure();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure]);

  const drop = (targetId: string | null) => {
    if (!dragId) return;
    if (targetId && blocked.has(targetId)) return; // no cycles / self
    onReparent(dragId, targetId);
    setDragId(null);
    setOverId(null);
  };

  const renderNode = (node: OrgNode) => {
    const td = typeDef(mode, node.type);
    const isOver = overId === node.id && dragId && !blocked.has(node.id);
    const isBlocked = !!dragId && blocked.has(node.id);
    return (
      <li key={node.id}>
        <div
          ref={(el) => { if (el) nodeRefs.current.set(node.id, el); else nodeRefs.current.delete(node.id); }}
          draggable={canEdit}
          onDragStart={(e) => { setDragId(node.id); e.dataTransfer.effectAllowed = "move"; }}
          onDragEnd={() => { setDragId(null); setOverId(null); }}
          onDragOver={(e) => { if (dragId && !isBlocked) { e.preventDefault(); setOverId(node.id); } }}
          onDragLeave={() => setOverId((c) => (c === node.id ? null : c))}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(node.id); }}
          className={cn(
            "group relative w-[208px] rounded-xl border bg-card text-left shadow-[var(--shadow-card)] transition-all",
            canEdit && "cursor-grab active:cursor-grabbing",
            isOver ? "border-primary ring-2 ring-primary/40" : "border-border",
            isBlocked && "opacity-40",
          )}
        >
          <div className="h-1.5 rounded-t-xl" style={{ background: td.color }} />
          <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${td.color}1a`, color: td.color }}>{td.label}</span>
              {canEdit && (
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => onAddChild(node)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Add child"><Plus className="size-3.5" /></button>
                  <button onClick={() => onEdit(node)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit"><Pencil className="size-3.5" /></button>
                </div>
              )}
            </div>
            <p className="mt-1.5 truncate text-sm font-semibold" title={node.name}>{node.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1" title="Employees"><Users className="size-3" /> {node.headcount ?? 0}</span>
              <span className="inline-flex items-center gap-1" title="Vacancies"><UserPlus className="size-3" /> {node.vacancies ?? 0}</span>
              <span className="inline-flex items-center gap-1" title="Linked positions"><Briefcase className="size-3" /> {positionsFor(node)}</span>
              {!!node.functionalLinks?.length && <span className="inline-flex items-center gap-1 text-primary" title="Functional links"><Link2 className="size-3" /> {node.functionalLinks.length}</span>}
            </div>
          </div>
        </div>
        {node.children.length > 0 && <ul>{node.children.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <style>{`
        .octree, .octree ul { display:flex; list-style:none; margin:0; padding:0; }
        .octree { justify-content:center; padding-top:4px; }
        .octree ul { padding-top:24px; position:relative; justify-content:center; }
        .octree li { display:flex; flex-direction:column; align-items:center; position:relative; padding:24px 10px 0; }
        .octree li::before, .octree li::after { content:''; position:absolute; top:0; right:50%; border-top:2px solid var(--border); width:50%; height:24px; }
        .octree li::after { right:auto; left:50%; border-left:2px solid var(--border); }
        .octree li:only-child::before, .octree li:only-child::after { display:none; }
        .octree li:first-child::before, .octree li:last-child::after { border:0 none; }
        .octree li:last-child::before { border-right:2px solid var(--border); border-radius:0 8px 0 0; }
        .octree li:first-child::after { border-radius:8px 0 0 0; }
        .octree ul ul::before { content:''; position:absolute; top:0; left:50%; border-left:2px solid var(--border); width:0; height:24px; }
        .octree > li { padding-top:0; }
        .octree > li::before, .octree > li::after { display:none; }
      `}</style>
      <div ref={wrapRef} className="relative overflow-auto" style={{ maxHeight: "70vh" }} onDragOver={(e) => { if (dragId) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); drop(null); }}>
        {links.length > 0 && (
          <svg className="pointer-events-none absolute left-0 top-0" width={size.w} height={size.h} style={{ zIndex: 0 }}>
            {links.map((l) => (
              <g key={l.id}>
                <path d={`M ${l.x1} ${l.y1} C ${l.x1} ${(l.y1 + l.y2) / 2}, ${l.x2} ${(l.y1 + l.y2) / 2}, ${l.x2} ${l.y2}`} fill="none" stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.55} />
              </g>
            ))}
          </svg>
        )}
        <ul className="octree relative" style={{ zIndex: 1 }}>
          {roots.map(renderNode)}
        </ul>
        {roots.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">No structure yet. Add a company-level node to begin.</p>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-6 bg-border" /> Reporting line</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0 w-6 border-t-2 border-dashed border-primary" /> Functional link</span>
        {canEdit && <span>· Drag a card onto another to re-assign its parent</span>}
      </div>
    </div>
  );
}
