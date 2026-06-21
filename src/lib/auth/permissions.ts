/**
 * Permission model — shared by the client (UI gating) and the server
 * (enforcement). A role holds a PermissionMap; users reference a role. Admins
 * (isAdmin) bypass all checks and implicitly have every permission.
 *
 * No framework imports here so both server routes and client components can use it.
 */

export type Action = "view" | "create" | "edit" | "delete";

export interface ModuleDef {
  key: string;
  label: string;
  actions: Action[];
}

export const PERMISSION_MODULES: ModuleDef[] = [
  { key: "dashboard", label: "Dashboard", actions: ["view"] },
  { key: "jobs", label: "Jobs", actions: ["view", "create", "edit", "delete"] },
  { key: "families", label: "Departments", actions: ["view", "create", "edit", "delete"] },
  { key: "scoping", label: "Scoping", actions: ["view", "edit"] },
  { key: "grading", label: "Grading", actions: ["view", "create", "edit"] },
  { key: "structure", label: "Grade structure", actions: ["view"] },
  { key: "analytics", label: "Analytics & pay", actions: ["view", "create", "edit", "delete"] },
  { key: "jd", label: "Job descriptions", actions: ["view", "create", "edit", "delete"] },
  { key: "users", label: "User management", actions: ["view", "create", "edit", "delete"] },
  { key: "roles", label: "Role management", actions: ["view", "create", "edit", "delete"] },
  { key: "companies", label: "Companies", actions: ["view", "create", "edit", "delete"] },
];

export type PermissionMap = Record<string, Partial<Record<Action, boolean>>>;

export function emptyPermissions(): PermissionMap {
  const m: PermissionMap = {};
  for (const mod of PERMISSION_MODULES) {
    m[mod.key] = {};
    for (const a of mod.actions) m[mod.key][a] = false;
  }
  return m;
}

export function fullPermissions(): PermissionMap {
  const m: PermissionMap = {};
  for (const mod of PERMISSION_MODULES) {
    m[mod.key] = {};
    for (const a of mod.actions) m[mod.key][a] = true;
  }
  return m;
}

export interface PermissionContext {
  isAdmin: boolean;
  permissions: PermissionMap;
}

/** Does the actor have `action` on `module`? Admins always pass. */
export function can(ctx: PermissionContext | null | undefined, module: string, action: Action = "view"): boolean {
  if (!ctx) return false;
  if (ctx.isAdmin) return true;
  return ctx.permissions?.[module]?.[action] === true;
}

/** Built-in role templates seeded on first use. */
export const DEFAULT_ROLES: { name: string; description: string; isSystem: boolean; isAdmin: boolean; permissions: PermissionMap }[] = [
  {
    name: "Administrator",
    description: "Full control over every company, user, role and setting.",
    isSystem: true,
    isAdmin: true,
    permissions: fullPermissions(),
  },
  {
    name: "HR Manager",
    description: "Manage jobs, families, scoping, grading, structure, analytics and job descriptions.",
    isSystem: true,
    isAdmin: false,
    permissions: buildPermissions({
      dashboard: ["view"],
      jobs: ["view", "create", "edit", "delete"],
      families: ["view", "create", "edit", "delete"],
      scoping: ["view", "edit"],
      grading: ["view", "create", "edit"],
      structure: ["view"],
      analytics: ["view", "create", "edit", "delete"],
      jd: ["view", "create", "edit", "delete"],
    }),
  },
  {
    name: "Analyst",
    description: "Create and edit jobs, grading and job descriptions; view everything operational.",
    isSystem: true,
    isAdmin: false,
    permissions: buildPermissions({
      dashboard: ["view"],
      jobs: ["view", "create", "edit"],
      families: ["view"],
      scoping: ["view"],
      grading: ["view", "create", "edit"],
      structure: ["view"],
      analytics: ["view"],
      jd: ["view", "create", "edit"],
    }),
  },
  {
    name: "Viewer",
    description: "Read-only access to operational data.",
    isSystem: true,
    isAdmin: false,
    permissions: buildPermissions({
      dashboard: ["view"],
      jobs: ["view"],
      families: ["view"],
      scoping: ["view"],
      grading: ["view"],
      structure: ["view"],
      analytics: ["view"],
      jd: ["view"],
    }),
  },
];

export function buildPermissions(spec: Record<string, Action[]>): PermissionMap {
  const m = emptyPermissions();
  for (const [mod, actions] of Object.entries(spec)) {
    if (!m[mod]) m[mod] = {};
    for (const a of actions) m[mod][a] = true;
  }
  return m;
}
