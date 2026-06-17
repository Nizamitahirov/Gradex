import Link from "next/link";
import {
  ArrowRight,
  Target,
  Layers,
  Gauge,
  Grid3x3,
  ShieldCheck,
  BarChart3,
  Check,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { gradeColor } from "@/lib/grade-colors";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, var(--primary), transparent 40%), radial-gradient(circle at 80% 30%, var(--info), transparent 45%)",
          }}
        />
        <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            Inspired by the Global Grading System methodology
          </div>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Level every job. <br className="hidden sm:block" />
            <span className="text-primary">Pay with confidence.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Gradex turns a consulting-heavy job-leveling process into self-service software.
            Scope your organization, band your roles, and grade hundreds of jobs on a defensible
            1–25 scale — with dashboards, a structure grid, and a full audit trail.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Open the demo <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/signup">Create an account</Link>
            </Button>
          </div>

          {/* Grade ramp strip */}
          <div className="mx-auto mt-16 flex max-w-3xl items-end justify-center gap-1">
            {Array.from({ length: 25 }, (_, i) => i + 1).map((g) => (
              <div
                key={g}
                className="flex-1 rounded-t-sm"
                style={{ height: 12 + g * 3, backgroundColor: gradeColor(g).solid }}
                title={`Grade ${g}`}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">The 1–25 global grade scale</p>
        </div>
      </section>

      {/* 3-step methodology */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Three steps. One defensible grade.</h2>
            <p className="mt-3 text-muted-foreground">
              The proven methodology, made approachable for busy HR teams.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Target,
                step: "01",
                title: "Scope",
                body: "Size your organization from revenue, headcount, geography and complexity. Gradex recommends how many grades you should use and where the CEO sits.",
              },
              {
                icon: Layers,
                step: "02",
                title: "Band",
                body: "Place each job into a career band across the dual IC and Management paths. Banding narrows the plausible grade range before detailed grading.",
              },
              {
                icon: Gauge,
                step: "03",
                title: "Grade",
                body: "Evaluate each job against seven standard factors through a guided wizard. Answers map to a single global grade, with the work fully shown.",
              },
            ].map((s) => (
              <div key={s.step} className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="size-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground tnum">{s.step}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Grid3x3, title: "Grade structure grid", body: "See your whole job architecture at a glance — jobs arranged by grade and band, color-coded." },
            { icon: BarChart3, title: "Dashboards & analytics", body: "Distributions by grade, band and family; anomaly flags; recent activity." },
            { icon: ShieldCheck, title: "Explainable & auditable", body: "Every grade shows its work and is stored with the answers that produced it." },
          ].map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <f.icon className="size-4" />
              </div>
              <div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Ready to level your jobs?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Explore the fully-seeded demo organization — no signup required.
          </p>
          <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-sm text-muted-foreground sm:flex-row sm:justify-center sm:gap-6">
            {["25 sample jobs", "5 families", "Live grade structure"].map((i) => (
              <li key={i} className="flex items-center gap-2">
                <Check className="size-4 text-success" /> {i}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Open the demo <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>An independent platform inspired by GGS. Not affiliated with Willis Towers Watson.</p>
        </div>
      </footer>
    </div>
  );
}
