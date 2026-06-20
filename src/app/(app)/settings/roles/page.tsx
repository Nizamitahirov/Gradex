"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldPlus, Trash2, Pencil, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PERMISSION_MODULES, emptyPermissions, type Action, type PermissionMap } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

interface RoleRow {
  id: string;
  name: string;
  description?: string;
  permissions?: PermissionMap;
  isAdmin?: boolean;
  isSystem?: boolean;
}

const ACTION_LABEL: Record<Action, string> = { view: "View", create: "Create", edit: "Edit", delete: "Delete" };

export default function RolesSettingsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data: roles } = useQuery<RoleRow[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.roles;
    },
  });

  const [editing, setEditing] = React.useState<RoleRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const canCreate = can("roles", "create");
  const canEdit = can("roles", "edit");
  const canDelete = can("roles", "delete");
  const refresh = () => qc.invalidateQueries({ queryKey: ["roles"] });

  const del = async (r: RoleRow) => {
    if (!confirm(`Delete role "${r.name}"?`)) return;
    const res = await fetch(`/api/roles/${r.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    toast.success("Role deleted");
    refresh();
  };

  const summarize = (r: RoleRow) => {
    if (r.isAdmin) return "Full access to everything";
    const p = r.permissions ?? {};
    const mods = PERMISSION_MODULES.filter((m) => Object.values(p[m.key] ?? {}).some(Boolean));
    return mods.length ? mods.map((m) => m.label).join(", ") : "No permissions";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Roles & permissions</CardTitle>
            <CardDescription>Define what each role can do across the platform, action by action.</CardDescription>
          </div>
          {canCreate && <Button size="sm" onClick={() => setCreating(true)}><ShieldPlus className="size-4" /> New role</Button>}
        </CardHeader>
        <CardContent className="space-y-2">
          {(roles ?? []).map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-xl border border-border px-3 py-3">
              <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", r.isAdmin ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                <ShieldCheck className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {r.name}
                  {r.isAdmin && <Badge variant="default">Admin</Badge>}
                  {r.isSystem && <Badge variant="secondary" className="gap-1"><Lock className="size-3" /> Built-in</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{r.description || summarize(r)}</p>
              </div>
              {canEdit && <Button variant="ghost" size="sm" onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>}
              {canDelete && !r.isSystem && <Button variant="ghost" size="sm" onClick={() => del(r)}><Trash2 className="size-4" /></Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      {(creating || editing) && (
        <RoleDialog role={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={refresh} />
      )}
    </div>
  );
}

function RoleDialog({ role, onClose, onSaved }: { role: RoleRow | null; onClose: () => void; onSaved: () => void }) {
  const editing = !!role;
  const [name, setName] = React.useState(role?.name ?? "");
  const [description, setDescription] = React.useState(role?.description ?? "");
  const [isAdmin, setIsAdmin] = React.useState(role?.isAdmin ?? false);
  const [perms, setPerms] = React.useState<PermissionMap>(() => {
    const base = emptyPermissions();
    if (role?.permissions) for (const k of Object.keys(base)) base[k] = { ...base[k], ...role.permissions[k] };
    return base;
  });
  const [saving, setSaving] = React.useState(false);

  const toggle = (mod: string, action: Action) =>
    setPerms((p) => ({ ...p, [mod]: { ...p[mod], [action]: !p[mod]?.[action] } }));

  const toggleRow = (mod: string, on: boolean) =>
    setPerms((p) => {
      const m = { ...p[mod] };
      for (const a of PERMISSION_MODULES.find((x) => x.key === mod)!.actions) m[a] = on;
      return { ...p, [mod]: m };
    });

  const save = async () => {
    if (!name.trim()) return toast.error("Role name is required");
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), isAdmin, permissions: perms };
      const res = await fetch(editing ? `/api/roles/${role!.id}` : "/api/roles", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(editing ? "Role updated" : "Role created");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const readOnly = role?.isSystem && role?.isAdmin; // the built-in Administrator stays full

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit role" : "New role"}</DialogTitle>
          <DialogDescription>Toggle each permission. Admin roles bypass all checks and access every company.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Role name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="HR Manager" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary" disabled={readOnly} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <p className="text-sm font-medium">Full administrator</p>
              <p className="text-xs text-muted-foreground">Grants every permission and access to all companies.</p>
            </div>
            <Switch checked={isAdmin} disabled={readOnly} onCheckedChange={setIsAdmin} />
          </div>

          {!isAdmin && (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Module</th>
                    {(["view", "create", "edit", "delete"] as Action[]).map((a) => (
                      <th key={a} className="px-2 py-2 text-center font-semibold">{ACTION_LABEL[a]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((m) => {
                    const allOn = m.actions.every((a) => perms[m.key]?.[a]);
                    return (
                      <tr key={m.key} className="border-t border-border">
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => toggleRow(m.key, !allOn)} className="text-left font-medium hover:text-primary">{m.label}</button>
                        </td>
                        {(["view", "create", "edit", "delete"] as Action[]).map((a) => (
                          <td key={a} className="px-2 py-2 text-center">
                            {m.actions.includes(a) ? (
                              <input type="checkbox" checked={!!perms[m.key]?.[a]} onChange={() => toggle(m.key, a)} className="size-4 accent-[var(--primary)]" />
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || readOnly}>{saving ? "Saving…" : editing ? "Save changes" : "Create role"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
