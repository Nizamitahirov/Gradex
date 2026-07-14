"use client";

import * as React from "react";
import { toast } from "sonner";
import { Network, Plus, Users, UserPlus, Boxes, Pencil, ChevronRight, UploadCloud, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useOrgData } from "@/hooks/use-org-data";
import { useOrgUnits, useOrgUnitMutations } from "@/hooks/use-org-units";
import { buildTree, typeDef, childTypeOf, type OrgUnit, type OrgNode } from "@/lib/org/structure";
import { downloadStructureTemplate, parseStructure, type ParsedNode } from "@/lib/org/structure-file";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrgChart } from "@/components/org/org-chart";
import { UnitDialog } from "@/components/org/unit-dialog";

export default function OrganizationPage() {
  const { can } = useAuth();
  const canEdit = can("families", "edit");
  const canCreate = can("families", "create");
  const canDelete = can("families", "delete");

  const { data: org } = useOrgData();
  const { data, isLoading } = useOrgUnits();
  const { update } = useOrgUnitMutations();

  const units = React.useMemo(() => data?.units ?? [], [data]);
  const [view, setView] = React.useState<"chart" | "table">("chart");
  const [dialog, setDialog] = React.useState<null | { unit: OrgUnit | null; parentId?: string | null; type?: string }>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);

  // "Positions" derived from real jobs, matched by name & type.
  const jobs = React.useMemo(() => org?.jobs ?? [], [org]);
  const familyName = React.useMemo(() => Object.fromEntries((org?.families ?? []).map((f) => [f.id, f.name])), [org]);
  const positionsFor = React.useCallback(
    (u: OrgUnit) => {
      const n = u.name.trim().toLowerCase();
      switch (u.type) {
        case "parent_company":
        case "subsidiary":
        case "company": return jobs.length;
        case "department": return jobs.filter((j) => (familyName[j.familyId] ?? "").trim().toLowerCase() === n).length;
        case "section": return jobs.filter((j) => (j.section ?? "").trim().toLowerCase() === n).length;
        case "division": return jobs.filter((j) => (j.division ?? "").trim().toLowerCase() === n).length;
        case "unit": return jobs.filter((j) => (j.unit ?? "").trim().toLowerCase() === n).length;
        default: return 0;
      }
    },
    [jobs, familyName],
  );

  const totalEmployees = units.reduce((s, u) => s + (u.headcount ?? 0), 0);
  const totalVacancies = units.reduce((s, u) => s + (u.vacancies ?? 0), 0);
  const agileCount = units.filter((u) => typeDef(u.type).group === "agile").length;
  const nonAgileCount = units.filter((u) => typeDef(u.type).group === "non_agile").length;
  const roots = React.useMemo(() => buildTree(units), [units]);
  const maxDepth = React.useMemo(() => {
    let d = 0;
    const walk = (n: OrgNode) => { d = Math.max(d, n.depth + 1); n.children.forEach(walk); };
    roots.forEach(walk);
    return d;
  }, [roots]);

  const reparent = (id: string, newParentId: string | null) =>
    update.mutate({ id, parentId: newParentId }, { onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization structure"
        description="Design your company structure — corporate (Parent Company, Subsidiary), non-agile (Department, Section, Division, Unit) or agile (Tribe, Squad, Chapter) — as a table and an interactive org chart."
        action={
          canCreate ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(true)}><UploadCloud className="size-4" /> Bulk upload</Button>
              <Button onClick={() => setDialog({ unit: null, parentId: roots[0]?.id ?? null, type: roots.length ? childTypeOf(roots[0]?.type ?? null) : "parent_company" })}>
                <Plus className="size-4" /> Add node
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Structure nodes" value={units.length} icon={Boxes} hint={`${maxDepth} level${maxDepth === 1 ? "" : "s"} deep`} />
        <StatCard label="Employees" value={totalEmployees} icon={Users} hint="across the structure" />
        <StatCard label="Vacancies" value={totalVacancies} icon={UserPlus} hint="open positions" />
        <StatCard label="Agile / Non-agile" value={`${agileCount} / ${nonAgileCount}`} icon={Network} hint="nodes by model" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as "chart" | "table")}>
          <TabsList>
            <TabsTrigger value="chart"><Network className="mr-1.5 size-4" /> Org chart</TabsTrigger>
            <TabsTrigger value="table"><Boxes className="mr-1.5 size-4" /> Table</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : units.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No structure yet"
          description="Start with a Parent Company node, add levels beneath it, or bulk-upload the whole structure from Excel."
          action={
            canCreate ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setBulkOpen(true)}><UploadCloud className="size-4" /> Bulk upload</Button>
                <Button onClick={() => setDialog({ unit: null, parentId: null, type: "parent_company" })}><Plus className="size-4" /> Add node</Button>
              </div>
            ) : undefined
          }
        />
      ) : view === "chart" ? (
        <OrgChart
          units={units}
          canEdit={canEdit}
          title={org?.org?.name ?? "Organization"}
          positionsFor={positionsFor}
          onAddChild={(p) => setDialog({ unit: null, parentId: p.id, type: childTypeOf(p.type) })}
          onEdit={(u) => setDialog({ unit: u })}
          onReparent={reparent}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">Structure</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Type</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Employees</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Vacancies</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Positions</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Functional</th>
                    {canEdit && <th className="w-24" />}
                  </tr>
                </thead>
                <tbody>
                  {roots.map((r) => (
                    <TableRows
                      key={r.id}
                      node={r}
                      canEdit={canEdit}
                      canCreate={canCreate}
                      positionsFor={positionsFor}
                      onAddChild={(p) => setDialog({ unit: null, parentId: p.id, type: childTypeOf(p.type) })}
                      onEdit={(u) => setDialog({ unit: u })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {dialog && (
        <UnitDialog
          unit={dialog.unit}
          defaultParentId={dialog.parentId}
          defaultType={dialog.type}
          units={units}
          canDelete={canDelete}
          onClose={() => setDialog(null)}
        />
      )}
      {bulkOpen && <BulkDialog hasExisting={units.length > 0} onClose={() => setBulkOpen(false)} />}
    </div>
  );
}

function BulkDialog({ hasExisting, onClose }: { hasExisting: boolean; onClose: () => void }) {
  const { bulk } = useOrgUnitMutations();
  const [parsed, setParsed] = React.useState<ParsedNode[] | null>(null);
  const [fileName, setFileName] = React.useState("");
  const [replace, setReplace] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const onFile = async (f: File | null) => {
    if (!f) return;
    setBusy(true);
    try {
      const nodes = await parseStructure(f);
      setParsed(nodes);
      setFileName(f.name);
      toast.success(`Recognized ${nodes.length} nodes`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the file");
    } finally {
      setBusy(false);
    }
  };

  const importNow = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const res = await bulk.mutateAsync({ nodes: parsed, replace });
      toast.success(`Imported ${(res as { created: number }).created} nodes`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const byType = (parsed ?? []).reduce<Record<string, number>>((acc, n) => { acc[n.type] = (acc[n.type] ?? 0) + 1; return acc; }, {});

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk upload structure</DialogTitle>
          <DialogDescription>Fill the template (Parent Company → Subsidiary → Department → Section → Division → Unit) and the system builds the hierarchy automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button variant="outline" onClick={() => downloadStructureTemplate()} className="w-full"><Download className="size-4" /> Download Excel template</Button>

          {!parsed ? (
            <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-10 transition-colors hover:border-primary/40 hover:bg-accent/40">
              {busy ? <Loader2 className="size-6 animate-spin text-primary" /> : <UploadCloud className="size-6 text-primary" />}
              <span className="text-sm font-medium">Upload the filled template (.xlsx)</span>
              <span className="text-xs text-muted-foreground">Each row is one branch; blanks inherit the branch above</span>
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><FileSpreadsheet className="size-4 text-primary" /> {fileName}</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(byType).map(([t, c]) => <Badge key={t} variant="secondary">{typeDef(t).label}: {c}</Badge>)}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-4 accent-[var(--primary)]" disabled={!hasExisting} />
                Replace the existing structure {hasExisting ? "" : "(nothing to replace yet)"}
              </label>
              <Button variant="ghost" size="sm" onClick={() => { setParsed(null); setFileName(""); }}>Choose a different file</Button>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={importNow} disabled={!parsed || busy}>{busy ? "Importing…" : `Import ${parsed?.length ?? 0} nodes`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TableRows({
  node, canEdit, canCreate, positionsFor, onAddChild, onEdit,
}: {
  node: OrgNode;
  canEdit: boolean;
  canCreate: boolean;
  positionsFor: (u: OrgUnit) => number;
  onAddChild: (p: OrgUnit) => void;
  onEdit: (u: OrgUnit) => void;
}) {
  const td = typeDef(node.type);
  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-accent/40">
        <td className="px-4 py-2.5">
          <span className="flex items-start" style={{ paddingLeft: node.depth * 18 }}>
            {node.depth > 0 && <ChevronRight className="mr-1 mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />}
            <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: td.color }} />
            <span className="ml-2 min-w-0">
              <span className="block font-medium leading-tight">{node.name}</span>
              {node.nameEn && <span className="block text-[11px] text-muted-foreground">{node.nameEn}</span>}
            </span>
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${td.color}1a`, color: td.color }}>{td.label}</span>
        </td>
        <td className="px-3 py-2.5 text-right tnum">{node.headcount ?? 0}</td>
        <td className="px-3 py-2.5 text-right tnum">{node.vacancies ?? 0}</td>
        <td className="px-3 py-2.5 text-right tnum text-muted-foreground">{positionsFor(node)}</td>
        <td className="px-3 py-2.5 text-center text-muted-foreground tnum">{node.functionalLinks?.length ?? 0}</td>
        {canEdit && (
          <td className="px-3 py-2.5">
            <div className="flex justify-end gap-1">
              {canCreate && <button onClick={() => onAddChild(node)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Add child"><Plus className="size-4" /></button>}
              <button onClick={() => onEdit(node)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit"><Pencil className="size-4" /></button>
            </div>
          </td>
        )}
      </tr>
      {node.children.map((c) => (
        <TableRows key={c.id} node={c} canEdit={canEdit} canCreate={canCreate} positionsFor={positionsFor} onAddChild={onAddChild} onEdit={onEdit} />
      ))}
    </>
  );
}
