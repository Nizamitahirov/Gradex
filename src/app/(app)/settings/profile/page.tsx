"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Monitor, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";

export default function ProfileSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [name, setName] = React.useState("");
  React.useEffect(() => {
    if (user) setName(user.displayName);
  }, [user]);

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
          <CardDescription>How you appear in Gradex.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">{user?.email ?? user?.username ?? ""}</div>
          </div>
          <div className="space-y-2 sm:max-w-sm">
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={() => toast.success("Profile saved")}>Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose your theme. Dark mode is first-class.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-md grid-cols-3 gap-3">
            {themes.map((t) => {
              const Icon = t.icon;
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <Icon className="size-5" />
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
