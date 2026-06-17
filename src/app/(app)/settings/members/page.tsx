"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/utils";
import type { Role } from "@/types";

const ROLE_DESC: Record<Role, string> = {
  admin: "Full control — members, scoping, settings, delete.",
  analyst: "Create & edit families, jobs and evaluations.",
  viewer: "Read-only access to org data.",
};

export default function MembersSettingsPage() {
  const members = useAppStore((s) => s.members);
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("analyst");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Members</CardTitle>
            <CardDescription>People with access to this organization.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus className="size-4" /> Invite
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
              <Avatar className="size-8">
                <AvatarFallback>{initials(m.displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Badge variant={m.role === "admin" ? "default" : "secondary"} className="capitalize">
                {m.role}
              </Badge>
              {m.status === "invited" && <Badge variant="warning">Invited</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles</CardTitle>
          <CardDescription>What each role can do.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(ROLE_DESC) as Role[]).map((r) => (
            <div key={r} className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5 capitalize">{r}</Badge>
              <p className="text-sm text-muted-foreground">{ROLE_DESC[r]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>They&apos;ll get access to this organization with the chosen role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESC[role]}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!email.trim()) return;
                toast.success(`Invite sent to ${email.trim()}`);
                setEmail("");
                setOpen(false);
              }}
            >
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
