"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Target, Trash2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScaleVisual } from "@/components/scale-visual";

export default function OrganizationSettingsPage() {
  const org = useAppStore((s) => s.orgs.find((o) => o.id === s.currentOrgId));
  const resetDemo = useAppStore((s) => s.resetDemo);

  const [name, setName] = React.useState(org?.name ?? "");
  const [industry, setIndustry] = React.useState(org?.industry ?? "");

  React.useEffect(() => {
    if (org) {
      setName(org.name);
      setIndustry(org.industry);
    }
  }, [org]);

  if (!org) return null;
  const scoping = org.scoping;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization profile</CardTitle>
          <CardDescription>Basic details about your organization.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgname">Name</Label>
              <Input id="orgname" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => toast.success("Saved")}>Save changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Scoping</CardTitle>
            <CardDescription>The grade range your organization uses.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/scoping">
              <Target className="size-4" /> Edit scoping
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {scoping?.completed ? (
            <div className="space-y-4">
              <p className="text-sm">
                A <strong className="tnum">{scoping.result.usedGrades.length}-grade</strong> structure,
                grades <strong className="tnum">{scoping.result.bottomGrade}–{scoping.result.topGrade}</strong>,
                CEO at grade <strong className="tnum">{scoping.result.topGrade}</strong>.
              </p>
              <ScaleVisual
                bottom={scoping.result.bottomGrade}
                top={scoping.result.topGrade}
                ceo={scoping.result.ceoGrade}
                className="max-w-md"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scoping is not complete.{" "}
              <Link href="/scoping" className="text-primary hover:underline">
                Complete it now.
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>Reset the demo organization to its seeded state.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              resetDemo();
              toast.success("Demo data reset");
            }}
          >
            <Trash2 className="size-4" /> Reset demo data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
