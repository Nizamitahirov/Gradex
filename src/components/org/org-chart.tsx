"use client";

import * as React from "react";
import {
  Plus, Search, X, ZoomIn, ZoomOut, Scan, Maximize2, Minimize2, ChevronsDownUp, ChevronsUpDown,
  RotateCcw, Users, UserPlus, Download, PanelsTopLeft, Rows3, Columns3, Layers, LayoutGrid,
} from "lucide-react";
import { buildTree, descendantIds, typeDef, readableText, type OrgUnit } from "@/lib/org/structure";
import {
  augmentTree, computeLayout, parentMap, edgePath, buildSvg, buildHtml, NODE_W, NODE_H,
  type ANode, type Orientation,
} from "@/lib/org/chart-layout";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Props {
  units: OrgUnit[];
  canEdit: boolean;
  title?: string;
  positionsFor: (u: OrgUnit) => number;
  onAddChild: (parent: OrgUnit) => void;
  onEdit: (u: OrgUnit) => void;
  onReparent: (id: string, newParentId: string | null) => void;
}

const MIN_ZOOM = 0.06;
const MAX_ZOOM = 1.6;

export function OrgChart({ units, canEdit, title = "Organization", positionsFor, onAddChild, onEdit, onReparent }: Props) {
  const roots = React.useMemo(() => buildTree(units), [units]);
  const aroots = React.useMemo(() => augmentTree(roots, true), [roots]);
  const parents = React.useMemo(() => parentMap(aroots), [aroots]);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = React.useState<Orientation>("horizontal");
  const [zoom, setZoom] = React.useState(0.6);
  const [pan, setPan] = React.useState({ x: 40, y: 24 });
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [groupOpen, setGroupOpen] = React.useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = React.useState(false);
  const [panning, setPanning] = React.useState(false);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [hoverEdge, setHoverEdge] = React.useState<string | null>(null);

  const withChildren = React.useMemo(() => new Set(units.filter((u) => units.some((c) => c.parentId === u.id)).map((u) => u.id)), [units]);
  const groupIds = React.useMemo(() => [...parents.keys()].filter((id) => id.startsWith("grp:")), [parents]);
  const blocked = React.useMemo(() => (dragId ? new Set([dragId, ...descendantIds(units, dragId)]) : new Set<string>()), [dragId, units]);

  const searchLc = search.trim().toLowerCase();
  const searchActive = searchLc.length > 0;
  const { matches, forceOpen } = React.useMemo(() => {
    const matches = new Set<string>(), forceOpen = new Set<string>();
    if (!searchLc) return { matches, forceOpen };
    for (const u of units) {
      if (`${u.name} ${u.nameEn ?? ""}`.toLowerCase().includes(searchLc)) {
        matches.add(u.id);
        let p = parents.get(u.id) ?? null;
        while (p) { forceOpen.add(p); p = parents.get(p) ?? null; }
      }
    }
    return { matches, forceOpen };
  }, [searchLc, units, parents]);

  const isOpen = React.useCallback((n: ANode) => {
    if (searchActive && forceOpen.has(n.id)) return true;
    return n.isGroup ? groupOpen.has(n.id) : !collapsed.has(n.id);
  }, [searchActive, forceOpen, groupOpen, collapsed]);

  const { placed, edges, width, height } = React.useMemo(
    () => computeLayout(aroots, orientation, isOpen),
    [aroots, orientation, isOpen],
  );

  // Per-type legend (matches the client reference chart: colored by role).
  const legend = React.useMemo(() => {
    const g = new Map<string, number>();
    units.forEach((u) => g.set(u.type, (g.get(u.type) ?? 0) + 1));
    return [...g.entries()].map(([type, count]) => ({ type, label: typeDef(type).label, color: typeDef(type).color, count })).sort((a, b) => b.count - a.count);
  }, [units]);

  // fit / pan / zoom
  const fit = React.useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || width <= 1 || height <= 1) return;
    // Fill the viewport: scale up small trees (cap 1.4) so the page isn't half-empty, centre on both axes.
    const z = Math.max(MIN_ZOOM, Math.min((vp.clientWidth - 48) / width, (vp.clientHeight - 48) / height, 1.4));
    setZoom(Math.round(z * 1000) / 1000);
    setPan({ x: (vp.clientWidth - width * z) / 2, y: (vp.clientHeight - height * z) / 2 });
  }, [width, height]);
  const didFit = React.useRef(false);
  React.useEffect(() => { if (!didFit.current && width > 1) { didFit.current = true; requestAnimationFrame(fit); } }, [width, fit]);
  React.useEffect(() => { requestAnimationFrame(fit); }, [fullscreen, orientation, fit]);

  const panState = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    panState.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setPanning(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => { if (panState.current) setPan({ x: panState.current.px + (e.clientX - panState.current.x), y: panState.current.py + (e.clientY - panState.current.y) }); };
  const onPointerUp = (e: React.PointerEvent) => { panState.current = null; setPanning(false); try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ } };
  // Scroll wheel zooms toward the cursor; the whole canvas pans by dragging.
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const vp = viewportRef.current;
    const factor = Math.exp(-e.deltaY * 0.0015);
    setZoom((z) => {
      const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * factor * 1000) / 1000));
      if (vp) {
        const rect = vp.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        setPan((p) => ({ x: cx - ((cx - p.x) / z) * nz, y: cy - ((cy - p.y) / z) * nz }));
      }
      return nz;
    });
  };
  const zoomBy = (d: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + d) * 100) / 100)));

  const expandAll = () => { setCollapsed(new Set()); setGroupOpen(new Set(groupIds)); };
  const collapseAll = () => { setCollapsed(new Set(withChildren)); setGroupOpen(new Set()); };
  const toggleNode = (n: ANode) => {
    if (n.isGroup) setGroupOpen((s) => { const x = new Set(s); if (x.has(n.id)) x.delete(n.id); else x.add(n.id); return x; });
    else setCollapsed((s) => { const x = new Set(s); if (x.has(n.id)) x.delete(n.id); else x.add(n.id); return x; });
  };
  const drop = (targetId: string) => { if (!dragId || blocked.has(targetId)) return; onReparent(dragId, targetId); setDragId(null); setOverId(null); };

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const fullLayout = () => computeLayout(augmentTree(roots, false), orientation, () => true);
  const slug = title.replace(/\s+/g, "-").toLowerCase();
  const exportSvg = () => download(buildSvg(fullLayout(), orientation), `${slug}-org-chart.svg`, "image/svg+xml");
  const exportHtml = () => download(buildHtml(fullLayout(), orientation, title), `${slug}-org-chart.html`, "text/html;charset=utf-8");

  return (
    <div
      className={cn("flex flex-col overflow-hidden rounded-2xl border border-border bg-muted/30", fullscreen && "fixed inset-0 z-[60] rounded-none bg-background")}
      style={fullscreen ? undefined : { height: "calc(100dvh - 236px)", minHeight: 520 }}
    >
      <style>{`@keyframes gx-flow { to { stroke-dashoffset: -28; } }`}</style>
      <div className="relative min-h-0 flex-1">
        {/* Controls */}
        <div className="absolute right-3 top-3 z-20 flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Axtar / Search…" className="h-9 w-48 rounded-lg border border-border bg-card/95 pl-8 pr-7 text-sm shadow-sm outline-none backdrop-blur focus:border-primary" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}
          </div>
          {/* auto-arrange */}
          <button onClick={fit} title="Auto-arrange — fit all open cards, no empty space"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card/95 px-3 text-sm font-medium shadow-sm backdrop-blur transition-colors hover:bg-accent">
            <LayoutGrid className="size-4 text-primary" /> <span className="hidden sm:inline">Arrange</span>
          </button>
          {/* orientation */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
            <Ctrl onClick={() => setOrientation("horizontal")} title="Horizontal" active={orientation === "horizontal"}><Columns3 className="size-4" /></Ctrl>
            <Ctrl onClick={() => setOrientation("vertical")} title="Vertical" active={orientation === "vertical"}><Rows3 className="size-4" /></Ctrl>
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
            <Ctrl onClick={() => zoomBy(-0.1)} title="Zoom out"><ZoomOut className="size-4" /></Ctrl>
            <button onClick={fit} className="min-w-[42px] rounded-md px-1 text-xs font-semibold tabular-nums text-muted-foreground hover:text-foreground" title="Fit">{Math.round(zoom * 100)}%</button>
            <Ctrl onClick={() => zoomBy(0.1)} title="Zoom in"><ZoomIn className="size-4" /></Ctrl>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <Ctrl onClick={fit} title="Fit / center"><Scan className="size-4" /></Ctrl>
            <Ctrl onClick={() => { setZoom(0.8); setPan({ x: 40, y: 24 }); }} title="Reset"><RotateCcw className="size-4" /></Ctrl>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <Ctrl onClick={collapseAll} title="Collapse all"><ChevronsDownUp className="size-4" /></Ctrl>
            <Ctrl onClick={expandAll} title="Expand all"><ChevronsUpDown className="size-4" /></Ctrl>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button title="Export" className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"><Download className="size-4" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportSvg}><PanelsTopLeft className="size-4" /> Export as SVG</DropdownMenuItem>
                <DropdownMenuItem onClick={exportHtml}><Download className="size-4" /> Export as HTML</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Ctrl onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Exit full screen" : "Full screen"}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</Ctrl>
          </div>
        </div>

        {/* Canvas */}
        <div ref={viewportRef} className="h-full w-full touch-none overflow-hidden" style={{ cursor: panning ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onWheel={onWheel}>
          <div className="relative origin-top-left" style={{ width, height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <svg className="absolute left-0 top-0" width={width} height={height} style={{ overflow: "visible", pointerEvents: "none" }}>
              {edges.map((e) => {
                const d = edgePath(e, orientation);
                const hov = hoverEdge === e.id;
                return (
                  <g key={e.id}>
                    <path
                      d={d} fill="none"
                      stroke={hov ? "var(--primary)" : e.dashed ? "var(--primary)" : "var(--border)"}
                      strokeWidth={hov ? 3 : 1.5}
                      strokeLinecap="round"
                      strokeDasharray={hov ? "7 7" : e.dashed ? "5 4" : undefined}
                      opacity={hov ? 1 : e.dashed ? 0.6 : 1}
                      style={hov ? { animation: "gx-flow .55s linear infinite" } : undefined}
                    />
                    {/* transparent wide hit target for hover */}
                    <path d={d} fill="none" stroke="transparent" strokeWidth={14} style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onMouseEnter={() => setHoverEdge(e.id)} onMouseLeave={() => setHoverEdge((h) => (h === e.id ? null : h))} />
                  </g>
                );
              })}
            </svg>

            {placed.map(({ node, x, y, hasKids, open, hidden }) => {
              const td = typeDef(node.type);
              const hit = searchActive && matches.has(node.id);
              const dim = searchActive && !matches.has(node.id) && !forceOpen.has(node.id);
              const isOver = overId === node.id && dragId && !blocked.has(node.id);
              const hc = node.headcount ?? 0, vc = node.vacancies ?? 0, pos = node.unit ? positionsFor(node.unit) : 0;
              const fg = readableText(node.color);
              const sub = fg === "#ffffff" ? "rgba(255,255,255,0.82)" : "rgba(26,28,46,0.62)";
              return (
                <div key={node.id} data-node style={{ position: "absolute", left: x, top: y, width: NODE_W, height: NODE_H }}>
                  <div
                    draggable={canEdit && !node.isGroup}
                    onDragStart={(e) => { if (!node.isGroup) { setDragId(node.id); e.dataTransfer.effectAllowed = "move"; } }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    onDragOver={(e) => { if (dragId && !node.isGroup && !blocked.has(node.id)) { e.preventDefault(); setOverId(node.id); } }}
                    onDragLeave={() => setOverId((c) => (c === node.id ? null : c))}
                    onDrop={(e) => { if (!node.isGroup) { e.preventDefault(); drop(node.id); } }}
                    onClick={() => { if (node.isGroup) toggleNode(node); else if (canEdit && node.unit) onEdit(node.unit); }}
                    title={`${node.name}${node.nameEn ? " — " + node.nameEn : ""}${node.isGroup ? "" : " · " + td.label + (hc || vc || pos ? ` · ${hc} emp / ${vc} vac / ${pos} pos` : "")}`}
                    className={cn(
                      "group flex h-full w-full items-stretch overflow-hidden rounded-md border shadow-sm transition-shadow",
                      (canEdit || node.isGroup) && "cursor-pointer hover:shadow-md",
                      hit ? "ring-2 ring-primary ring-offset-1" : isOver ? "ring-2 ring-primary/60" : "",
                      node.isGroup && "border-dashed",
                      dim && "opacity-30",
                    )}
                    style={{ background: node.color, borderColor: "rgba(0,0,0,0.16)" }}
                  >
                    <span className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-1">
                      <span className="truncate text-[12px] font-bold leading-tight" style={{ color: fg }}>{node.name}</span>
                      {node.nameEn && <span className="truncate text-[10px] leading-tight" style={{ color: sub }}>{node.nameEn}</span>}
                      <span className="flex items-center gap-1.5 truncate text-[8.5px] font-semibold uppercase leading-tight tracking-wide" style={{ color: sub }}>
                        {node.isGroup ? (
                          <span className="inline-flex items-center gap-1"><Layers className="size-2.5" /> {open ? "Açıq / open" : "Qrup · klik et"}</span>
                        ) : (
                          <>
                            <span>{td.label}</span>
                            {(hc > 0 || vc > 0) && (
                              <span className="inline-flex items-center gap-1 normal-case">
                                {hc > 0 && <><Users className="size-2.5" />{hc}</>}
                                {vc > 0 && <><UserPlus className="size-2.5" />{vc}</>}
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    </span>
                    {canEdit && !node.isGroup && (
                      <button onClick={(e) => { e.stopPropagation(); if (node.unit) onAddChild(node.unit); }} title="Add child" className="hidden w-6 shrink-0 items-center justify-center border-l group-hover:flex" style={{ borderColor: "rgba(0,0,0,0.16)", color: fg }}>
                        <Plus className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {hasKids && (
                    <button onClick={(e) => { e.stopPropagation(); toggleNode(node); }} title={open ? "Collapse" : "Expand"}
                      style={orientation === "horizontal" ? { position: "absolute", right: -9, top: NODE_H / 2 - 9 } : { position: "absolute", bottom: -9, left: NODE_W / 2 - 9 }}
                      className="z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-border bg-card px-1 text-[9px] font-bold text-muted-foreground shadow-sm hover:text-foreground">
                      {open ? "–" : `+${hidden}`}
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
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {legend.map((g) => (
          <span key={g.type} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] border border-black/10" style={{ background: g.color }} /> {g.label} <span className="tnum opacity-60">{g.count}</span></span>
        ))}
        <span className="ml-auto">{units.length} units · same-type groups fold when &gt; 5 · scroll to zoom · drag to pan</span>
      </div>
    </div>
  );
}

function Ctrl({ onClick, title, active, children }: { onClick: () => void; title: string; active?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className={cn("flex size-8 items-center justify-center rounded-md transition-colors", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
      {children}
    </button>
  );
}
