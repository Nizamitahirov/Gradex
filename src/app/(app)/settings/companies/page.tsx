"use client";

import * as React from "react";
import { toast } from "sonner";
import { Building2, Plus, Check, Layers } from "lucide-react";
import { useCompanyScope } from "@/hooks/use-org-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CompaniesSettingsPage() {
  const { data, setActiveCompany, refetch } = useCompanyScope();
  const companies = data?.companies ?? [];
  const scope = data?.scope ?? null;

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [industry, setIndustry] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [saving, setSaving] = React.useState(false);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), industry: industry.trim(), currency }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Company "${name.trim()}" created`);
      setOpen(false);
      setName("");
      setIndustry("");
      setActiveCompany(json.id); // switch to the new, empty company
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Companies</CardTitle>
            <CardDescription>Each company has its own jobs, departments, scoping, structure and analytics. New companies start empty.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New company
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {companies.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No companies yet.</p>}
          {companies.map((c) => {
            const active = scope === c.id;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                </div>
                {active && <Badge variant="success"><Check className="size-3" /> Active</Badge>}
                {!active && (
                  <Button variant="ghost" size="sm" onClick={() => setActiveCompany(c.id)}>
                    Switch to
                  </Button>
                )}
              </div>
            );
          })}
          {companies.length > 1 && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <Layers className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">All companies</p>
                <p className="truncate text-xs text-muted-foreground">Aggregated view across every company you can access</p>
              </div>
              {scope === "all" ? (
                <Badge variant="success"><Check className="size-3" /> Active</Badge>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setActiveCompany("all")}>View all</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New company</DialogTitle>
            <DialogDescription>Creates a fresh, empty company. You&apos;ll set up scoping, departments and jobs from scratch.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company name</Label>
              <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-industry">Industry</Label>
              <Input id="company-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD", "EUR", "GBP", "AZN", "JPY"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving || !name.trim()}>
              {saving ? "Creating…" : "Create company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
