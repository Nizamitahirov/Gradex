/**
 * Server-side helpers for org-scoped Firestore mutations (Admin SDK).
 * All API routes use these; every route verifies the session first.
 */

import "server-only";
import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { AUTH_COOKIE, verifyToken, type AuthPayload } from "@/lib/auth";

export function getActor(req: NextRequest): AuthPayload | null {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** The primary (first) org document reference. Single-tenant demo deployment. */
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
