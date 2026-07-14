"use client";

import * as React from "react";
import {
  Plus, Search, X, ZoomIn, ZoomOut, Scan, Maximize2, Minimize2,
  ChevronsDownUp, ChevronsUpDown, RotateCcw, Users, UserPlus,
} from "lucide-react";
import { buildTree, descendantIds, typeDef, groupColorOf, GROUP_COLOR, GROUP_LABEL, type OrgUnit, type OrgNode, type TypeGroup } from "@/lib/org/structure";
import { cn } from "@/lib/utils";

interface Props {
  units: OrgUnit[];
  canEdit: boolean;
  positionsFor: (u: OrgUnit) => number;
  onAddChild: (parent: OrgUnit) => void;
  onEdit: (u: OrgUnit) => void;
  onReparent: (id: string, newParentId: string | null) => void;
}

// Layout constants — compact horizontal (left→right) tidy tree.
const COL = 236;   // x distance per depth
const ROW = 46;    // y slot per leaf
const NODE_W = 196;
const NODE_H = 40;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 1.6;

interface Placed { node: OrgNode; x: number; y: number; hasKids: boolean; collapsed: boolean; hidden: number }
interface Edge { id: string; x1: number; y1: number; x2: number; y2: number; dashed?: boolean }

function countDescendants(n: OrgNode): number {
  return n.children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}

export function OrgChart({ units, canEdit, positionsFor, onAddChild, onEdit, onReparent }: Props) {
  const roots = React.useMemo(() => buildTree(units), [units]);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(0.6);
  const [pan, setPan] = React.useState({ x: 40, y: 24 });
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = React.useState(false);
  const [panning, setPanning] = React.useState(false);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const parentOf = React.useMemo(() => new Map(units.map((u) => [u.id, u.parentId])), [units]);
  const withChildren = React.useMemo(() => new Set(units.filter((u) => units.some((c) => c.parentId === u.id)).map((u) => u.id)), [units]);
  const blocked = React.useMemo(() => (dragId ? new Set([dragId, ...descendantIds(units, dragId)]) : new Set<string>()), [dragId, units]);

  const searchLc = search.trim().toLowerCase();
  const searchActive = searchLc.length > 0;
  const { matches, forceOpen } = React.useMemo(() => {
    const matches = new Set<string>(), forceOpen = new Set<string>();
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

  // ---- tidy layout: depth → x column, leaf slots → y, internal centred on children ----
  const { placed, edges, width, height } = React.useMemo(() => {
    const placed: Placed[] = [];
    const edges: Edge[] = [];
    const byId = new Map<string, Placed>();
    let leaf = 0, maxDepth = 0;
    const place = (node: OrgNode, depth: number): number => {
      maxDepth = Math.max(maxDepth, depth);
      const isCollapsed = collapsed.has(node.id) && !(searchActive && forceOpen.has(node.id));
      const kids = isCollapsed ? [] : node.children;
      const x = depth * COL;
      let y: number;
      if (kids.length === 0) { y = leaf * ROW; leaf++; }
      else {
        const ys = kids.map((c) => place(c, depth + 1));
        y = (ys[0] + ys[ys.length - 1]) / 2;
        kids.forEach((c) => {
          const cp = byId.get(c.id)!;
          edges.push({ id: `${node.id}-${c.id}`, x1: x + NODE_W, y1: y + NODE_H / 2, x2: cp.x, y2: cp.y + NODE_H / 2 });
        });
      }
      const p: Placed = { node, x, y, hasKids: node.children.length > 0, collapsed: isCollapsed, hidden: countDescendants(node) };
      placed.push(p); byId.set(node.id, p);
      return y;
    };
    roots.forEach((r) => place(r, 0));
    // functional (dotted) links
    for (const u of units) {
      const a = byId.get(u.id);
      if (!a || !u.functionalLinks?.length) continue;
      for (const t of u.functionalLinks) {
        const b = byId.get(t);
        if (b) edges.push({ id: `f-${u.id}-${t}`, x1: a.x + NODE_W / 2, y1: a.y + NODE_H, x2: b.x + NODE_W / 2, y2: b.y, dashed: true });
      }
    }
    return { placed, edges, width: (maxDepth + 1) * COL, height: Math.max(1, leaf * ROW), byId };
  }, [roots, collapsed, searchActive, forceOpen, units]);

  const legend = React.useMemo(() => {
    const groups = new Map<TypeGroup, number>();
    units.forEach((u) => { const g = typeDef(u.type).group; groups.set(g, (groups.get(g) ?? 0) + 1); });
    return [...groups.entries()].map(([g, count]) => ({ group: g, label: GROUP_LABEL[g], color: GROUP_COLOR[g], count })).sort((a, b) => b.count - a.count);
  }, [units]);

  // ---- fit / pan / zoom ----
  const fit = React.useCallback((w = width, h = height) => {
    const vp = viewportRef.current;
    if (!vp || !w || !h) return;
    const z = Math.max(MIN_ZOOM, Math.min((vp.clientWidth - 64) / w, (vp.clientHeight - 64) / h, 1));
    setZoom(Math.round(z * 1000) / 1000);
    setPan({ x: Math.max(24, (vp.clientWidth - w * z) / 2), y: Math.max(20, (vp.clientHeight - h * z) / 2) });
  }, [width, height]);

  const didFit = React.useRef(false);
  React.useEffect(() => {
    if (!didFit.current && width > 1 && height > 1) { didFit.current = true; requestAnimationFrame(() => fit()); }
  }, [width, height, fit]);
  React.useEffect(() => { requestAnimationFrame(() => fit()); /* refit on fullscreen */ }, [fullscreen, fit]);

  const panState = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
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
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z - e.deltaY * 0.001) * 1000) / 1000)));
  };

  const zoomBy = (d: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + d) * 100) / 100)));
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(withChildren));
  const toggleCollapse = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const drop = (targetId: string) => {
    if (!dragId || blocked.has(targetId)) return;
    onReparent(dragId, targetId);
    setDragId(null); setOverId(null);
  };

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-muted/30", fullscreen && "fixed inset-0 z-[60] rounded-none bg-background")}>
      <div className="relative" style={{ height: fullscreen ? "100vh" : "76vh" }}>
        {/* Controls */}
        <div className="absolute right-3 top-3 z-20 flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Axtar / Search…"
              className="h-9 w-48 rounded-lg border border-border bg-card/95 pl-8 pr-7 text-sm shadow-sm outline-none backdrop-blur focus:border-primary" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
            <Ctrl onClick={() => zoomBy(-0.1)} title="Zoom out"><ZoomOut className="size-4" /></Ctrl>
            <button onClick={() => fit()} className="min-w-[42px] rounded-md px-1 text-xs font-semibold tabular-nums text-muted-foreground hover:text-foreground" title="Fit to screen">{Math.round(zoom * 100)}%</button>
            <Ctrl onClick={() => zoomBy(0.1)} title="Zoom in"><ZoomIn className="size-4" /></Ctrl>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <Ctrl onClick={() => fit()} title="Fit / center"><Scan className="size-4" /></Ctrl>
            <Ctrl onClick={() => { setZoom(0.8); setPan({ x: 40, y: 24 }); }} title="Reset"><RotateCcw className="size-4" /></Ctrl>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <Ctrl onClick={collapseAll} title="Collapse all"><ChevronsDownUp className="size-4" /></Ctrl>
            <Ctrl onClick={expandAll} title="Expand all"><ChevronsUpDown className="size-4" /></Ctrl>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <Ctrl onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Exit full screen" : "Full screen"}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</Ctrl>
          </div>
        </div>

        {/* Canvas */}
        <div ref={viewportRef} className="h-full w-full touch-none overflow-hidden"
          style={{ cursor: panning ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onWheel={onWheel}>
          <div className="relative origin-top-left" style={{ width, height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            {/* connectors */}
            <svg className="pointer-events-none absolute left-0 top-0" width={width} height={height} style={{ overflow: "visible" }}>
              {edges.map((e) => (
                <path key={e.id}
                  d={`M ${e.x1} ${e.y1} C ${(e.x1 + e.x2) / 2} ${e.y1}, ${(e.x1 + e.x2) / 2} ${e.y2}, ${e.x2} ${e.y2}`}
                  fill="none" stroke={e.dashed ? "var(--primary)" : "var(--border)"} strokeWidth={e.dashed ? 1.5 : 1.5}
                  strokeDasharray={e.dashed ? "5 4" : undefined} opacity={e.dashed ? 0.6 : 1} />
              ))}
            </svg>

            {/* nodes */}
            {placed.map(({ node, x, y, hasKids, collapsed: isCol, hidden }) => {
              const td = typeDef(node.type);
              const color = groupColorOf(node.type);
              const hit = searchActive && matches.has(node.id);
              const dim = searchActive && !matches.has(node.id) && !forceOpen.has(node.id);
              const isOver = overId === node.id && dragId && !blocked.has(node.id);
              const hc = node.headcount ?? 0, vc = node.vacancies ?? 0, pos = positionsFor(node);
              return (
                <div key={node.id} data-node style={{ position: "absolute", left: x, top: y, width: NODE_W, height: NODE_H }}>
                  <div
                    draggable={canEdit}
                    onDragStart={(e) => { setDragId(node.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    onDragOver={(e) => { if (dragId && !blocked.has(node.id)) { e.preventDefault(); setOverId(node.id); } }}
                    onDragLeave={() => setOverId((c) => (c === node.id ? null : c))}
                    onDrop={(e) => { e.preventDefault(); drop(node.id); }}
                    onClick={() => canEdit && onEdit(node)}
                    title={`${node.name}${node.nameEn ? " — " + node.nameEn : ""} · ${td.label}${hc || vc || pos ? ` · ${hc} emp / ${vc} vac / ${pos} pos` : ""}`}
                    className={cn(
                      "group flex h-full w-full items-stretch overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-card)] transition-shadow",
                      canEdit && "cursor-pointer hover:shadow-md",
                      hit ? "border-primary ring-2 ring-primary/50" : isOver ? "border-primary ring-2 ring-primary/40" : "border-border",
                      dim && "opacity-30",
                    )}
                  >
                    <span className="w-1 shrink-0" style={{ background: color }} />
                    <span className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1">
                      <span className="truncate text-[12.5px] font-semibold leading-tight" style={{ color: "var(--foreground)" }}>{node.name}</span>
                      <span className="flex items-center gap-1.5 truncate text-[10px] leading-tight text-muted-foreground">
                        <span style={{ color }}>{td.label}</span>
                        {(hc > 0 || vc > 0) && (
                          <span className="inline-flex items-center gap-1">
                            {hc > 0 && <><Users className="size-2.5" />{hc}</>}
                            {vc > 0 && <><UserPlus className="size-2.5" />{vc}</>}
                          </span>
                        )}
                      </span>
                    </span>
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); onAddChild(node); }} title="Add child"
                        className="hidden w-6 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-accent hover:text-foreground group-hover:flex">
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {hasKids && (
                    <button onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }} title={isCol ? "Expand" : "Collapse"}
                      style={{ position: "absolute", right: -9, top: NODE_H / 2 - 9 }}
                      className="z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-border bg-card px-1 text-[9px] font-bold text-muted-foreground shadow-sm hover:text-foreground">
                      {isCol ? `+${hidden}` : "–"}
                    </button>
                  )}
                </div>
              );
            })}
            {placed.length === 0 && <p className="p-16 text-center text-sm text-muted-foreground">No structure yet.</p>}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {legend.map((g) => (
          <span key={g.group} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: g.color }} /> {g.label} <span className="tnum opacity-60">{g.count}</span>
          </span>
        ))}
        <span className="ml-auto">{units.length} units · Ctrl+scroll to zoom · drag empty space to pan{canEdit ? " · drag a card to re-parent" : ""}</span>
      </div>
    </div>
  );
}

function Ctrl({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
      {children}
    </button>
  );
}
