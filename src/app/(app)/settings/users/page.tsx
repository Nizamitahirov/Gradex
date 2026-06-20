"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, KeyRound, Trash2, Pencil, Copy, ShieldCheck, Building2, Layers } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useCompanyScope } from "@/hooks/use-org-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials } from "@/lib/utils";

interface UserRow {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  roleId: string | null;
  allCompanies: boolean;
  companyAccess: string[];
  isActive: boolean;
  mustChangePassword: boolean;
}
interface RoleRow { id: string; name: string; isAdmin?: boolean }

export default function UsersSettingsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data: scope } = useCompanyScope();
  const companies = scope?.companies ?? [];

  const { data: users } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.users;
    },
  });
  const { data: roles } = useQuery<RoleRow[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.roles;
    },
  });

  const roleName = (id: string | null) => roles?.find((r) => r.id === id)?.name ?? "—";
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [tempCreds, setTempCreds] = React.useState<{ username: string; password: string } | null>(null);

  const canCreate = can("users", "create");
  const canEdit = can("users", "edit");
  const canDelete = can("users", "delete");

  const refresh = () => qc.invalidateQueries({ queryKey: ["users"] });

  const resetPassword = async (u: UserRow) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    setTempCreds({ username: u.username, password: json.tempPassword });
    refresh();
  };

  const toggleActive = async (u: UserRow) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    refresh();
  };

  const del = async (u: UserRow) => {
    if (!confirm(`Delete ${u.displayName}? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) return toast.error(json.error);
    toast.success("User deleted");
    refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Users</CardTitle>
            <CardDescription>People who can sign in, their role and the companies they can access.</CardDescription>
          </div>
          {canCreate && <Button size="sm" onClick={() => setCreating(true)}><UserPlus className="size-4" /> New user</Button>}
        </CardHeader>
        <CardContent className="space-y-2">
          {(users ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No users yet.</p>}
          {(users ?? []).map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-3 py-2.5">
              <Avatar className="size-9"><AvatarFallback>{initials(u.displayName)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.displayName} <span className="font-normal text-muted-foreground">@{u.username}</span></p>
                <p className="truncate text-xs text-muted-foreground">{u.email ?? "no email"}</p>
              </div>
              <Badge variant="outline" className="gap-1"><ShieldCheck className="size-3" />{roleName(u.roleId)}</Badge>
              {u.allCompanies ? (
                <Badge variant="secondary" className="gap-1"><Layers className="size-3" /> All companies</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1"><Building2 className="size-3" /> {u.companyAccess.length} compan{u.companyAccess.length === 1 ? "y" : "ies"}</Badge>
              )}
              {!u.isActive && <Badge variant="warning">Disabled</Badge>}
              {u.mustChangePassword && <Badge variant="warning">Temp password</Badge>}
              {canEdit && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(u)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => resetPassword(u)} title="Reset password"><KeyRound className="size-4" /></Button>
                  <Switch checked={u.isActive} onCheckedChange={() => toggleActive(u)} />
                </>
              )}
              {canDelete && <Button variant="ghost" size="sm" onClick={() => del(u)}><Trash2 className="size-4" /></Button>}
            </div>
          ))}
        </CardContent>
      </Card>

      {(creating || editing) && (
        <UserDialog
          user={editing}
          roles={roles ?? []}
          companies={companies}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(creds) => { refresh(); if (creds) setTempCreds(creds); }}
        />
      )}

      <Dialog open={!!tempCreds} onOpenChange={(o) => !o && setTempCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>Share these credentials securely. The user must change the password on first sign-in.</DialogDescription>
          </DialogHeader>
          {tempCreds && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Username</span><span className="font-semibold tnum">{tempCreds.username}</span></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Password</span>
                <span className="flex items-center gap-2">
                  <code className="rounded bg-background px-2 py-1 font-semibold">{tempCreds.password}</code>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(tempCreds.password); toast.success("Copied"); }}><Copy className="size-4" /></Button>
                </span>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setTempCreds(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserDialog({
  user, roles, companies, onClose, onSaved,
}: {
  user: UserRow | null;
  roles: RoleRow[];
  companies: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (creds?: { username: string; password: string }) => void;
}) {
  const editing = !!user;
  const [username, setUsername] = React.useState(user?.username ?? "");
  const [displayName, setDisplayName] = React.useState(user?.displayName ?? "");
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [roleId, setRoleId] = React.useState(user?.roleId ?? roles[0]?.id ?? "");
  const [allCompanies, setAllCompanies] = React.useState(user?.allCompanies ?? false);
  const [access, setAccess] = React.useState<string[]>(user?.companyAccess ?? []);
  const [saving, setSaving] = React.useState(false);

  const selectedRole = roles.find((r) => r.id === roleId);
  const roleIsAdmin = selectedRole?.isAdmin === true;

  const toggle = (id: string) =>
    setAccess((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const save = async () => {
    if (!username.trim() || !displayName.trim()) return toast.error("Username and full name are required");
    setSaving(true);
    try {
      const payload = {
        username: username.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        roleId,
        allCompanies: roleIsAdmin || allCompanies,
        companyAccess: roleIsAdmin || allCompanies ? [] : access,
        ...(password.trim() ? { password: password.trim() } : {}),
      };
      const res = await fetch(editing ? `/api/users/${user!.id}` : "/api/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(editing ? "User updated" : "User created");
      onSaved(json.tempPassword ? { username: username.trim(), password: json.tempPassword } : undefined);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
          <DialogDescription>{editing ? "Update role and company access." : "They'll get a temporary password to change on first sign-in."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jane" disabled={editing} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email (optional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>{roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editing ? "Set new temp password (optional)" : "Temp password (optional)"}</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Auto-generated if blank" />
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Access all companies</p>
                <p className="text-xs text-muted-foreground">Admins always have full access.</p>
              </div>
              <Switch checked={roleIsAdmin || allCompanies} disabled={roleIsAdmin} onCheckedChange={setAllCompanies} />
            </div>
            {!roleIsAdmin && !allCompanies && (
              <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Companies this user can access</p>
                {companies.length === 0 && <p className="text-xs text-muted-foreground">No companies yet.</p>}
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {companies.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm hover:bg-accent">
                      <input type="checkbox" checked={access.includes(c.id)} onChange={() => toggle(c.id)} className="size-4 accent-[var(--primary)]" />
                      <Building2 className="size-3.5 text-muted-foreground" />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create user"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
