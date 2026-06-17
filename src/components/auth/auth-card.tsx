"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { firebaseEnabled } from "@/lib/firebase/client";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const isSignup = mode === "signup";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Demo mode: no Firebase project configured, so we proceed into the
    // fully-seeded demo org. With Firebase env vars set, wire real Auth here.
    if (!firebaseEnabled) {
      await new Promise((r) => setTimeout(r, 400));
      toast.success(isSignup ? "Welcome to Gradex" : "Signed in");
      router.push("/dashboard");
      return;
    }
    toast.message("Firebase is configured — connect real auth in AuthCard.");
    setLoading(false);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary/5 p-10 lg:flex">
        <Logo />
        <div>
          <h2 className="max-w-sm text-3xl font-semibold tracking-tight">
            Level every job. Pay with confidence.
          </h2>
          <p className="mt-4 max-w-sm text-muted-foreground">
            Scope, band and grade your organization on a consistent 1–25 scale — the GGS
            methodology, made self-service.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Independent platform inspired by the Global Grading System.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSignup ? "Start leveling your jobs in minutes." : "Sign in to your Gradex workspace."}
          </p>

          {!firebaseEnabled && (
            <div className="mt-4 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Demo mode — any details take you straight into a seeded organization.
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Jane Cooper" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <Button variant="outline" className="w-full" onClick={onSubmit} disabled={loading}>
            <GoogleIcon /> Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-primary hover:underline">
              {isSignup ? "Sign in" : "Sign up"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75z" />
    </svg>
  );
}
