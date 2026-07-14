"use client";

import * as React from "react";
import {
  Users, UserPlus, Briefcase, Plus, Pencil, Link2, Search, X,
  ZoomIn, ZoomOut, Scan, Maximize2, Minimize2, ChevronsDownUp, ChevronsUpDown, RotateCcw,
} from "lucide-react";
import { buildTree, descendantIds, typeDef, type OrgUnit, type OrgNode } from "@/lib/org/structure";
import { cn } from "@/lib/utils";

interface Props {
  units: OrgUnit[];
  canEdit: boolean;
  positionsFor: (u: OrgUnit) => number;
  onAddChild: (parent: OrgUnit) => void;
  onEdit: (u: OrgUnit) => void;
  onReparent: (id: string, newParentId: string | null) => void;
}

interface LinkLine { id: string; x1: number; y1: number; x2: number; y2: number }

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;

export function OrgChart({ units, canEdit, positionsFor, onAddChild, onEdit, onReparent }: Props) {
  const roots = React.useMemo(() => buildTree(units), [units]);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const nodeRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 24, y: 16 });
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = React.useState(false);
  const [panning, setPanning] = React.useState(false);
  const [links, setLinks] = React.useState<LinkLine[]>([]);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const parentOf = React.useMemo(() => new Map(units.map((u) => [u.id, u.parentId])), [units]);
  const withChildren = React.useMemo(() => new Set(units.filter((u) => units.some((c) => c.parentId === u.id)).map((u) => u.id)), [units]);
  const blocked = React.useMemo(() => (dragId ? new Set([dragId, ...descendantIds(units, dragId)]) : new Set<string>()), [dragId, units]);

  // Depth per node (for initial collapse).
  const depthOf = React.useMemo(() => {
    const m = new Map<string, number>();
    const walk = (nodes: OrgNode[]) => nodes.forEach((n) => { m.set(n.id, n.depth); walk(n.children); });
    walk(roots);
    return m;
  }, [roots]);

  // Initial collapse: on first load of a sizeable tree, collapse everything at depth ≥ 2.
  const didInit = React.useRef(false);
  React.useEffect(() => {
    if (didInit.current || units.length === 0) return;
    didInit.current = true;
    if (units.length > 30) {
      setCollapsed(new Set(units.filter((u) => withChildren.has(u.id) && (depthOf.get(u.id) ?? 0) >= 2).map((u) => u.id)));
    }
  }, [units, withChildren, depthOf]);

  // Search → matches + ancestors to keep visible.
  const searchLc = search.trim().toLowerCase();
  const { matches, forceOpen } = React.useMemo(() => {
    const matches = new Set<string>();
    const forceOpen = new Set<string>();
    if (!searchLc) return { matches, forceOpen };
    for (const u of units) {
      if (`${u.name} ${u.nameEn ?? ""}`.toLowerCase().includes(searchLc)) {
        matches.add(u.id);
        let p = parentOf.get(u.id) ?? null;
        while (p) { forceOpen.add(p); p = parentOf.get(p) ?? null; }
      }
    }
    return { matches, forceOpen };
  }, [searchLc, units, parentOf]);

  // Types present, for the legend.
  const legend = React.useMemo(() => {
    const seen = new Map<string, number>();
    units.forEach((u) => seen.set(u.type, (seen.get(u.type) ?? 0) + 1));
    return [...seen.entries()].map(([key, count]) => ({ ...typeDef(key), count })).sort((a, b) => b.count - a.count);
  }, [units]);

  // ---- functional (dotted) link measurement ----
  const measure = React.useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    const cr = content.getBoundingClientRect();
    const center = (el: HTMLDivElement) => {
      const r = el.getBoundingClientRect();
      return { x: (r.left - cr.left + r.width / 2) / zoom, y: (r.top - cr.top + r.height / 2) / zoom };
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
  }, [units, zoom]);

  React.useLayoutEffect(() => { measure(); }, [measure, collapsed, fullscreen, forceOpen]);
  React.useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  // ---- pan ----
  const panState = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target !== viewportRef.current && e.target !== contentRef.current) return;
    panState.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!panState.current) return;
    setPan({ x: panState.current.px + (e.clientX - panState.current.x), y: panState.current.py + (e.clientY - panState.current.y) });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    panState.current = null; setPanning(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const zoomBy = (d: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + d) * 100) / 100)));
  const reset = () => { setZoom(1); setPan({ x: 24, y: 16 }); };
  const fit = React.useCallback(() => {
    const vp = viewportRef.current, content = contentRef.current;
    if (!vp || !content) return;
    const cw = content.scrollWidth, ch = content.scrollHeight;
    if (!cw || !ch) return;
    const z = Math.min((vp.clientWidth - 48) / cw, (vp.clientHeight - 48) / ch, 1);
    const nz = Math.max(MIN_ZOOM, Math.round(z * 100) / 100);
    setZoom(nz);
    setPan({ x: Math.max(16, (vp.clientWidth - cw * nz) / 2), y: 16 });
  }, []);

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(withChildren));
  const toggleCollapse = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const drop = (targetId: string | null) => {
    if (!dragId) return;
    if (targetId && blocked.has(targetId)) return;
    onReparent(dragId, targetId);
    setDragId(null); setOverId(null);
  };

  const countDescendants = (node: OrgNode): number => node.children.reduce((s, c) => s + 1 + countDescendants(c), 0);
  const searchActive = searchLc.length > 0;

  const renderNode = (node: OrgNode) => {
    const td = typeDef(node.type);
    const isOver = overId === node.id && dragId && !blocked.has(node.id);
    const isBlocked = !!dragId && blocked.has(node.id);
    const hasKids = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id) && !(searchActive && forceOpen.has(node.id));
    const dimmed = searchActive && !matches.has(node.id) && !forceOpen.has(node.id);
    const hit = searchActive && matches.has(node.id);
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
            "group relative w-[220px] rounded-xl border bg-card text-left shadow-[var(--shadow-card)] transition-all",
            canEdit && "cursor-grab active:cursor-grabbing",
            hit ? "border-primary ring-2 ring-primary/50" : isOver ? "border-primary ring-2 ring-primary/40" : "border-border",
            isBlocked && "opacity-40",
            dimmed && "opacity-35",
          )}
        >
          <div className="h-1.5 rounded-t-xl" style={{ background: td.color }} />
          <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${td.color}1a`, color: td.color }}>{td.label}</span>
              {canEdit && (
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => onAddChild(node)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Add child"><Plus className="size-3.5" /></button>
                  <button onClick={() => onEdit(node)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit"><Pencil className="size-3.5" /></button>
                </div>
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug" title={node.name}>{node.name}</p>
            {node.nameEn && <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground" title={node.nameEn}>{node.nameEn}</p>}
            {(node.headcount || node.vacancies || positionsFor(node) || node.functionalLinks?.length) ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {!!node.headcount && <span className="inline-flex items-center gap-1" title="Employees"><Users className="size-3" /> {node.headcount}</span>}
                {!!node.vacancies && <span className="inline-flex items-center gap-1" title="Vacancies"><UserPlus className="size-3" /> {node.vacancies}</span>}
                {!!positionsFor(node) && <span className="inline-flex items-center gap-1" title="Linked positions"><Briefcase className="size-3" /> {positionsFor(node)}</span>}
                {!!node.functionalLinks?.length && <span className="inline-flex items-center gap-1 text-primary"><Link2 className="size-3" /> {node.functionalLinks.length}</span>}
              </div>
            ) : null}
          </div>
          {hasKids && (
            <button
              onClick={() => toggleCollapse(node.id)}
              className="absolute -bottom-3 left-1/2 z-10 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card px-1.5 text-[10px] font-bold text-muted-foreground shadow-sm hover:text-foreground"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? `+${countDescendants(node)}` : "–"}
            </button>
          )}
        </div>
        {hasKids && !isCollapsed && <ul>{node.children.map(renderNode)}</ul>}
      </li>
    );
  };

  const Toolbar = (
    <div className="absolute right-3 top-3 z-20 flex flex-wrap items-center justify-end gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Axtar / Search…"
          className="h-9 w-44 rounded-lg border border-border bg-card/95 pl-8 pr-7 text-sm shadow-md outline-none backdrop-blur focus:border-primary"
        />
        {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-md backdrop-blur">
        <CtrlBtn onClick={() => zoomBy(-0.1)} title="Zoom out"><ZoomOut className="size-4" /></CtrlBtn>
        <button onClick={reset} className="min-w-[44px] rounded-md px-1 text-xs font-semibold tabular-nums text-muted-foreground hover:text-foreground" title="Reset zoom">{Math.round(zoom * 100)}%</button>
        <CtrlBtn onClick={() => zoomBy(0.1)} title="Zoom in"><ZoomIn className="size-4" /></CtrlBtn>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <CtrlBtn onClick={fit} title="Fit / center"><Scan className="size-4" /></CtrlBtn>
        <CtrlBtn onClick={reset} title="Reset view"><RotateCcw className="size-4" /></CtrlBtn>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <CtrlBtn onClick={collapseAll} title="Collapse all"><ChevronsDownUp className="size-4" /></CtrlBtn>
        <CtrlBtn onClick={expandAll} title="Expand all"><ChevronsUpDown className="size-4" /></CtrlBtn>
        <span className="mx-0.5 h-5 w-px bg-border" />
        <CtrlBtn onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Exit full screen" : "Full screen"}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</CtrlBtn>
      </div>
    </div>
  );

  return (
    <div className={cn("rounded-2xl border border-border bg-muted/20", fullscreen && "fixed inset-0 z-[60] rounded-none bg-background p-3")}>
      <style>{`
        .octree, .octree ul { display:flex; list-style:none; margin:0; padding:0; }
        .octree { justify-content:center; padding-top:4px; }
        .octree ul { padding-top:28px; position:relative; justify-content:center; }
        .octree li { display:flex; flex-direction:column; align-items:center; position:relative; padding:28px 12px 0; }
        .octree li::before, .octree li::after { content:''; position:absolute; top:0; right:50%; border-top:2px solid var(--border); width:50%; height:28px; }
        .octree li::after { right:auto; left:50%; border-left:2px solid var(--border); }
        .octree li:only-child::before, .octree li:only-child::after { display:none; }
        .octree li:first-child::before, .octree li:last-child::after { border:0 none; }
        .octree li:last-child::before { border-right:2px solid var(--border); border-radius:0 8px 0 0; }
        .octree li:first-child::after { border-radius:8px 0 0 0; }
        .octree ul ul::before { content:''; position:absolute; top:0; left:50%; border-left:2px solid var(--border); width:0; height:28px; }
        .octree > li { padding-top:0; }
        .octree > li::before, .octree > li::after { display:none; }
      `}</style>
      <div className="relative" style={{ height: fullscreen ? "calc(100vh - 24px)" : "72vh" }}>
        {Toolbar}
        <div
          ref={viewportRef}
          className="h-full w-full touch-none overflow-hidden rounded-xl"
          style={{ cursor: panning ? "grabbing" : "default" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDragOver={(e) => { if (dragId) e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); drop(null); }}
        >
          <div ref={contentRef} className="relative inline-block origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} style={{ zIndex: 0 }}>
              {links.map((l) => (
                <path key={l.id} d={`M ${l.x1} ${l.y1} C ${l.x1} ${(l.y1 + l.y2) / 2}, ${l.x2} ${(l.y1 + l.y2) / 2}, ${l.x2} ${l.y2}`} fill="none" stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.55} />
              ))}
            </svg>
            {roots.length > 0 ? (
              <ul className="octree relative" style={{ zIndex: 1 }}>{roots.map(renderNode)}</ul>
            ) : (
              <p className="p-16 text-center text-sm text-muted-foreground">No structure yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Legend + hints */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {legend.slice(0, 10).map((t) => (
          <span key={t.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: t.color }} /> {t.label} <span className="tnum opacity-60">{t.count}</span>
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5"><span className="h-0 w-6 border-t-2 border-dashed border-primary" /> Functional link</span>
        {canEdit && <span>· drag to re-parent · drag empty space to pan</span>}
      </div>
    </div>
  );
}

function CtrlBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
      {children}
    </button>
  );
}
