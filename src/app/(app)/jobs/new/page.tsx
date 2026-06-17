"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewJobPage() {
  const router = useRouter();
  const org = useAppStore((s) => s.orgs.find((o) => o.id === s.currentOrgId));
  const families = useAppStore((s) => s.families);
  const jobs = useAppStore((s) => s.jobs);
  const addJob = useAppStore((s) => s.addJob);

  const [title, setTitle] = React.useState("");
  const [familyId, setFamilyId] = React.useState(families[0]?.id ?? "");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [reportsTo, setReportsTo] = React.useState("none");

  if (!org) return null;

  const scopingDone = org.scoping?.completed;

  if (!scopingDone) {
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
                Grading is gated until your organization is scoped, so grades are calibrated to its
                size. It only takes a minute.
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !familyId) {
      toast.error("Title and family are required.");
      return;
    }
    const job = addJob(org.id, {
      title: title.trim(),
      familyId,
      code: code.trim() || undefined,
      description: description.trim(),
      careerPath: "IC",
      band: "professional",
      reportsToJobId: reportsTo === "none" ? null : reportsTo,
    });
    toast.success("Job created — let's grade it.");
    router.push(`/jobs/${job.id}/grade`);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.push("/jobs")}>
        <ArrowLeft className="size-4" /> Jobs
      </Button>
      <PageHeader
        title="Add job"
        description="Capture the basics. Next you'll band and grade it through the wizard."
      />

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Financial Analyst" autoFocus />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Family</Label>
                <Select value={familyId} onValueChange={setFamilyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a family" />
                  </SelectTrigger>
                  <SelectContent>
                    {families.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Job code (optional)</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. FIN-204" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short summary of the role." />
            </div>
            <div className="space-y-2">
              <Label>Reports to (optional)</Label>
              <Select value={reportsTo} onValueChange={setReportsTo}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used for consistency checks during grading.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => router.push("/jobs")}>
                Cancel
              </Button>
              <Button type="submit">
                Continue to grading <ArrowRight className="size-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
