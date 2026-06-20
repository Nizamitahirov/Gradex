"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { can as canCheck, type Action, type PermissionMap } from "@/lib/auth/permissions";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  email?: string | null;
  mustChangePassword?: boolean;
  isAdmin?: boolean;
  allCompanies?: boolean;
  roleName?: string;
  permissions?: PermissionMap;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (module: string, action?: Action) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setUser(res.ok && data.success ? data.data.user : null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Force a password change on first login before using the app.
  useEffect(() => {
    if (!loading && user?.mustChangePassword && pathname !== "/change-password") {
      router.replace("/change-password");
    }
  }, [loading, user, pathname, router]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        return { success: true, mustChangePassword: data.data.user.mustChangePassword === true };
      }
      return { success: false, error: data.error || "Sign-in failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
    router.push("/login");
  }, [router]);

  const can = useCallback(
    (module: string, action: Action = "view") =>
      canCheck({ isAdmin: user?.isAdmin === true, permissions: user?.permissions ?? {} }, module, action),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
