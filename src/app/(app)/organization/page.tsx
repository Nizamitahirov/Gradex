"use client";

import * as React from "react";
import { toast } from "sonner";
import { Network, Plus, Users, UserPlus, Boxes, GitBranch, Pencil, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useOrgData } from "@/hooks/use-org-data";
import { useOrgUnits, useOrgUnitMutations } from "@/hooks/use-org-units";
import { buildTree, typeDef, typesFor, childTypeOf, type OrgUnit, type OrgNode, type StructureMode } from "@/lib/org/structure";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgChart } from "@/components/org/org-chart";
import { UnitDialog } from "@/components/org/unit-dialog";
import { cn } from "@/lib/utils";

export default function OrganizationPage() {
  const { can } = useAuth();
  const canEdit = can("families", "edit");
  const canCreate = can("families", "create");
  const canDelete = can("families", "delete");

  const { data: org } = useOrgData();
  const { data, isLoading } = useOrgUnits();
  const { update, setMode } = useOrgUnitMutations();

  const units = React.useMemo(() => data?.units ?? [], [data]);
  const mode: StructureMode = data?.structureMode ?? "functional";

  const [view, setView] = React.useState<"chart" | "table">("chart");
  const [dialog, setDialog] = React.useState<null | { unit: OrgUnit | null; parentId?: string | null; type?: string }>(null);

  // Derived "positions" from real jobs, matched to a node by name & type.
  const jobs = React.useMemo(() => org?.jobs ?? [], [org]);
  const familyName = React.useMemo(() => Object.fromEntries((org?.families ?? []).map((f) => [f.id, f.name])), [org]);
  const positionsFor = React.useCallback(
    (u: OrgUnit) => {
      const n = u.name.trim().toLowerCase();
      switch (u.type) {
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

  const reparent = (id: string, newParentId: string | null) => {
    update.mutate({ id, parentId: newParentId }, { onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });
  };

  const changeMode = (m: StructureMode) => {
    if (m === mode) return;
    setMode.mutate(m, { onError: (e) => toast.error(e instanceof Error ? e.message : "Failed") });
  };

  const roots = React.useMemo(() => buildTree(units), [units]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization structure"
        description="Design your company structure — Company, Department, Section, Division and Unit (or an agile Tribe / Squad / Chapter model) — as a table and an interactive org chart."
        action={
          canCreate ? (
            <Button onClick={() => setDialog({ unit: null, parentId: roots[0]?.id ?? null, type: roots.length ? childTypeOf(mode, roots[0]?.type ?? null) : "company" })}>
              <Plus className="size-4" /> Add node
            </Button>
          ) : undefined
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Structure nodes" value={units.length} icon={Boxes} hint={`${typesFor(mode).length} levels`} />
        <StatCard label="Employees" value={totalEmployees} icon={Users} hint="across the structure" />
        <StatCard label="Vacancies" value={totalVacancies} icon={UserPlus} hint="open positions" />
        <StatCard label="Model" value={mode === "agile" ? "Agile" : "Functional"} icon={GitBranch} hint={mode === "agile" ? "Tribe / Squad / Chapter" : "Dept / Section / Division"} />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as "chart" | "table")}>
          <TabsList>
            <TabsTrigger value="chart"><Network className="mr-1.5 size-4" /> Org chart</TabsTrigger>
            <TabsTrigger value="table"><Boxes className="mr-1.5 size-4" /> Table</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          {(["functional", "agile"] as StructureMode[]).map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              disabled={!canEdit}
              className={cn("rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors disabled:opacity-50", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : units.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No structure yet"
          description="Start with a company-level node, then add departments, sections, divisions and units beneath it."
          action={canCreate ? <Button onClick={() => setDialog({ unit: null, parentId: null, type: "company" })}><Plus className="size-4" /> Add company node</Button> : undefined}
        />
      ) : view === "chart" ? (
        <OrgChart
          units={units}
          mode={mode}
          canEdit={canEdit}
          positionsFor={positionsFor}
          onAddChild={(p) => setDialog({ unit: null, parentId: p.id, type: childTypeOf(mode, p.type) })}
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
                      mode={mode}
                      canEdit={canEdit}
                      canCreate={canCreate}
                      positionsFor={positionsFor}
                      onAddChild={(p) => setDialog({ unit: null, parentId: p.id, type: childTypeOf(mode, p.type) })}
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
          mode={mode}
          units={units}
          canDelete={canDelete}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function TableRows({
  node, mode, canEdit, canCreate, positionsFor, onAddChild, onEdit,
}: {
  node: OrgNode;
  mode: StructureMode;
  canEdit: boolean;
  canCreate: boolean;
  positionsFor: (u: OrgUnit) => number;
  onAddChild: (p: OrgUnit) => void;
  onEdit: (u: OrgUnit) => void;
}) {
  const td = typeDef(mode, node.type);
  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-accent/40">
        <td className="px-4 py-2.5">
          <span className="flex items-center" style={{ paddingLeft: node.depth * 20 }}>
            {node.depth > 0 && <ChevronRight className="mr-1 size-3.5 text-muted-foreground/50" />}
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: td.color }} />
            <span className="ml-2 font-medium">{node.name}</span>
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
        <TableRows key={c.id} node={c} mode={mode} canEdit={canEdit} canCreate={canCreate} positionsFor={positionsFor} onAddChild={onAddChild} onEdit={onEdit} />
      ))}
    </>
  );
}
