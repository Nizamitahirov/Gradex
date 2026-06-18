"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import { useOrgData } from "@/hooks/use-org-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScaleVisual } from "@/components/scale-visual";

export default function OrganizationSettingsPage() {
  const { data, isLoading } = useOrgData();

  if (isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;
  const org = data?.org;
  if (!org) return null;
  const scoping = org.scoping;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization profile</CardTitle>
          <CardDescription>Basic details about your organization (stored in Firestore).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgname">Name</Label>
              <Input id="orgname" defaultValue={org.name} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" defaultValue={org.industry} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Scoping</CardTitle>
            <CardDescription>The grade range your organization uses.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/scoping"><Target className="size-4" /> Edit scoping</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {scoping?.completed ? (
            <div className="space-y-4">
              <p className="text-sm">
                Company Grade <strong className="tnum">{scoping.result.companyGrade}</strong> (a{" "}
                <strong className="capitalize">{scoping.result.businessSize}</strong> business unit). Jobs span grades{" "}
                <strong className="tnum">1–{scoping.result.topGrade}</strong>; the CEO sits at grade{" "}
                <strong className="tnum">{scoping.result.companyGrade}</strong>.
              </p>
              <ScaleVisual bottom={scoping.result.bottomGrade} top={scoping.result.topGrade} ceo={scoping.result.ceoGrade} className="max-w-md" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scoping is not complete. <Link href="/scoping" className="text-primary hover:underline">Complete it now.</Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
