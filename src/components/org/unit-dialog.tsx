"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2, Save } from "lucide-react";
import { useOrgUnitMutations } from "@/hooks/use-org-units";
import { typesByGroup, descendantIds, UNIT_TYPES, type OrgUnit } from "@/lib/org/structure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectLabel, SelectGroup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const NONE = "__none__";

export function UnitDialog({
  unit, defaultParentId, defaultType, units, canDelete, onClose,
}: {
  unit: OrgUnit | null;
  defaultParentId?: string | null;
  defaultType?: string;
  units: OrgUnit[];
  canDelete: boolean;
  onClose: () => void;
}) {
  const editing = !!unit;
  const { create, update, remove } = useOrgUnitMutations();
  const groups = typesByGroup();

  const [name, setName] = React.useState(unit?.name ?? "");
  const [type, setType] = React.useState(unit?.type ?? defaultType ?? UNIT_TYPES[0].key);
  const [parentId, setParentId] = React.useState<string>(unit?.parentId ?? defaultParentId ?? NONE);
  const [headcount, setHeadcount] = React.useState(unit?.headcount ?? 0);
  const [vacancies, setVacancies] = React.useState(unit?.vacancies ?? 0);
  const [links, setLinks] = React.useState<string[]>(unit?.functionalLinks ?? []);
  const [saving, setSaving] = React.useState(false);

  // Eligible parents / link targets exclude self and descendants.
  const blocked = editing ? new Set([unit!.id, ...descendantIds(units, unit!.id)]) : new Set<string>();
  const eligible = units.filter((u) => !blocked.has(u.id));

  const toggleLink = (id: string) => setLinks((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const save = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        parentId: parentId === NONE ? null : parentId,
        headcount: Number(headcount) || 0,
        vacancies: Number(vacancies) || 0,
        functionalLinks: links,
      };
      if (editing) await update.mutateAsync({ id: unit!.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success(editing ? "Structure updated" : "Node added");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!unit) return;
    if (!confirm(`Delete "${unit.name}"? Its children move up to its parent.`)) return;
    try {
      await remove.mutateAsync(unit.id);
      toast.success("Node deleted");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const nameById = (id: string) => units.find((u) => u.id === id)?.name ?? "—";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit structure node" : "Add structure node"}</DialogTitle>
          <DialogDescription>Define the unit, its place in the hierarchy and its functional (dotted-line) links.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finance" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectGroup key={g.group}>
                      <SelectLabel>{g.label}</SelectLabel>
                      {g.types.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reports to (parent)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None (top level)</SelectItem>
                  {eligible.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Employees</Label>
              <Input type="number" min={0} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} className="tnum" />
            </div>
            <div className="space-y-1.5">
              <Label>Vacancies</Label>
              <Input type="number" min={0} value={vacancies} onChange={(e) => setVacancies(Number(e.target.value))} className="tnum" />
            </div>
          </div>
          {eligible.length > 0 && (
            <div className="space-y-1.5">
              <Label>Functional links (dotted lines)</Label>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {eligible.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                    <input type="checkbox" checked={links.includes(u.id)} onChange={() => toggleLink(u.id)} className="size-4 accent-[var(--primary)]" />
                    <span className="truncate">{u.name}</span>
                  </label>
                ))}
              </div>
              {links.length > 0 && <p className="text-xs text-muted-foreground">Linked to: {links.map(nameById).join(", ")}</p>}
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {editing && canDelete ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={del}><Trash2 className="size-4" /> Delete</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}><Save className="size-4" /> {saving ? "Saving…" : editing ? "Save" : "Add node"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
