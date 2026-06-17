/**
 * Firebase Admin SDK init — SPEC.md §3 & §11 (server-only).
 *
 * Used inside Route Handlers / Server Actions for privileged operations
 * (invites, bulk CSV imports, cross-doc aggregation). The Admin SDK bypasses
 * security rules, so callers MUST do their own auth/role checks.
 *
 * Service-account credentials come from server-only env vars on Vercel.
 * NEVER import this module from client components.
 */

import "server-only";
import { getApps, initializeApp, cert, getApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Stored with literal \n which we restore to real newlines.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const adminEnabled = Boolean(projectId && clientEmail && privateKey);

let adminApp: App | null = null;
if (adminEnabled) {
  adminApp = getApps().length
    ? getApp()
    : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function getAdminAuth() {
  if (!adminApp) throw new Error("Firebase Admin SDK is not configured.");
  return getAuth(adminApp);
}

export function getAdminDb() {
  if (!adminApp) throw new Error("Firebase Admin SDK is not configured.");
  return getFirestore(adminApp);
}
