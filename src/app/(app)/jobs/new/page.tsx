"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useOrgData } from "@/hooks/use-org-data";
import { useCreateJob } from "@/hooks/use-mutations";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewJobPage() {
  const router = useRouter();
  const { data, isLoading } = useOrgData();
  const createJob = useCreateJob();

  const [title, setTitle] = React.useState("");
  const [familyId, setFamilyId] = React.useState("");
  const [section, setSection] = React.useState("");
  const [division, setDivision] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [reportsTo, setReportsTo] = React.useState("none");

  React.useEffect(() => {
    if (data && !familyId && data.families[0]) setFamilyId(data.families[0].id);
  }, [data, familyId]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!data) return null;

  if (!data.org.scoping?.completed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Add job" description="Create a new role to grade." />
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Lock className="size-6" />
            </div>
            <div>
              <h3 className="font-medium">Complete scoping first</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Grading is gated until your organization is scoped, so grades are calibrated to its size.
              </p>
            </div>
            <Button asChild>
              <Link href="/scoping">Go to scoping <ArrowRight className="size-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !familyId) {
      toast.error("Title and department are required.");
      return;
    }
    try {
      const res = (await createJob.mutateAsync({
        title: title.trim(),
        familyId,
        section: section.trim() || undefined,
        division: division.trim() || undefined,
        unit: unit.trim() || undefined,
        code: code.trim() || undefined,
        description: description.trim(),
        careerPath: "IC",
        band: "3IC",
        reportsToJobId: reportsTo === "none" ? null : reportsTo,
      })) as { id: string };
      toast.success("Job created — let's grade it.");
      router.push(`/jobs/${res.id}/grade`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job");
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.push("/jobs")}>
        <ArrowLeft className="size-4" /> Jobs
      </Button>
      <PageHeader title="Add job" description="Capture the basics. Next you'll band and grade it through the wizard." />

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Financial Analyst" autoFocus />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={familyId} onValueChange={setFamilyId}>
                  <SelectTrigger><SelectValue placeholder="Choose a department" /></SelectTrigger>
                  <SelectContent>
                    {data.families.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Job code (optional)</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. FIN-204" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="section">Section (optional)</Label>
                <Input id="section" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Reporting" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="division">Division (optional)</Label>
                <Input id="division" value={division} onChange={(e) => setDivision(e.target.value)} placeholder="e.g. Corporate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit (optional)</Label>
                <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. Treasury" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short summary of the role." />
            </div>
            <div className="space-y-2">
              <Label>Reports to (optional)</Label>
              <Select value={reportsTo} onValueChange={setReportsTo}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {data.jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => router.push("/jobs")}>Cancel</Button>
              <Button type="submit" disabled={createJob.isPending}>
                {createJob.isPending ? "Creating…" : <>Continue to grading <ArrowRight className="size-4" /></>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
