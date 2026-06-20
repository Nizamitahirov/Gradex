"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useAuth();

  const tabs = [
    { href: "/settings/organization", label: "Organization", show: true },
    { href: "/settings/companies", label: "Companies", show: can("companies", "view") },
    { href: "/settings/users", label: "Users", show: can("users", "view") },
    { href: "/settings/roles", label: "Roles", show: can("roles", "view") },
    { href: "/settings/profile", label: "Profile", show: true },
  ].filter((t) => t.show);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your organization, companies, users, roles and profile." />
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
