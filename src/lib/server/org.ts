/**
 * Server-side helpers for company-scoped Firestore mutations (Admin SDK).
 * All API routes use these; every route verifies the session first.
 *
 * Multi-company: each company is a document in the `orgs` collection. A user's
 * access is stored on their `users` doc (`allCompanies` or `companyAccess[]`).
 * The active company is carried in the `gradex_company` cookie and validated
 * against the user's access on every request.
 */

import "server-only";
import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { AUTH_COOKIE, verifyToken, type AuthPayload } from "@/lib/auth";

export const COMPANY_COOKIE = "gradex_company";

export function getActor(req: NextRequest): AuthPayload | null {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export interface UserAccess {
  allCompanies: boolean;
  companyAccess: string[];
  role: string;
  isAdmin: boolean;
}

/**
 * Resolve a user's company access. Backward-compatible: users created before
 * multi-company (no access fields) are treated as full-access so nobody is
 * locked out of an existing deployment.
 */
export async function getUserAccess(userId: string): Promise<UserAccess> {
  const doc = await getAdminDb().collection("users").doc(userId).get();
  const d = doc.data() ?? {};
  const isAdmin = d.role === "admin" || d.isAdmin === true;
  const hasField = d.allCompanies !== undefined || Array.isArray(d.companyAccess);
  const allCompanies = hasField ? d.allCompanies === true || isAdmin : true;
  return {
    allCompanies,
    companyAccess: Array.isArray(d.companyAccess) ? (d.companyAccess as string[]) : [],
    role: d.role ?? "viewer",
    isAdmin,
  };
}

/** Org ids the user is allowed to see (all existing orgs for admins). */
export async function accessibleOrgIds(userId: string): Promise<string[]> {
  const access = await getUserAccess(userId);
  const db = getAdminDb();
  const allSnap = await db.collection("orgs").get();
  const existing = allSnap.docs.map((d) => d.id);
  if (access.allCompanies) return existing;
  // keep only ids that still exist, preserving the user's order
  return access.companyAccess.filter((id) => existing.includes(id));
}

/** The active company id from the cookie ("all" or an org id), if any. */
export function activeCompanyCookie(req: NextRequest): string | null {
  return req.cookies.get(COMPANY_COOKIE)?.value ?? null;
}

/**
 * Concrete active org ref the current user may read/write. Validates access and
 * falls back to the first accessible company when the cookie is unset or "all".
 * Returns null if the user has no accessible company.
 */
export async function getActiveOrgRef(req: NextRequest) {
  const actor = getActor(req);
  if (!actor) return null;
  const ids = await accessibleOrgIds(actor.userId);
  if (ids.length === 0) return null;
  const cookie = activeCompanyCookie(req);
  // In "All companies" mode there is no single target — mutations must pick one.
  if (cookie === "all") return null;
  const chosen = cookie && ids.includes(cookie) ? cookie : ids[0];
  return getAdminDb().collection("orgs").doc(chosen);
}

/** Legacy helper — the first org overall. Prefer getActiveOrgRef(req). */
export async function getPrimaryOrgRef() {
  const db = getAdminDb();
  const snap = await db.collection("orgs").limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].ref;
}

export async function logActivity(
  orgRef: FirebaseFirestore.DocumentReference,
  actor: AuthPayload,
  data: { type: string; summary: string; targetType?: string; targetId?: string },
) {
  await orgRef.collection("activity").add({
    ...data,
    actorId: actor.userId,
    actorName: actor.displayName,
    createdAt: Date.now(),
  });
}
