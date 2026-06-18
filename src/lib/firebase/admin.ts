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

interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Resolve service-account credentials from env. Supports either:
 *  - FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 of the full service account JSON), or
 *  - FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
 */
function resolveServiceAccount(): ServiceAccount | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      if (json.project_id && json.client_email && json.private_key) {
        return {
          projectId: json.project_id,
          clientEmail: json.client_email,
          privateKey: String(json.private_key).replace(/\\n/g, "\n"),
        };
      }
    } catch {
      /* fall through */
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) return { projectId, clientEmail, privateKey };
  return null;
}

const serviceAccount = resolveServiceAccount();
export const adminEnabled = serviceAccount !== null;

let adminApp: App | null = null;
if (serviceAccount) {
  adminApp = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount) });
}

export function getAdminAuth() {
  if (!adminApp) throw new Error("Firebase Admin SDK is not configured.");
  return getAuth(adminApp);
}

export function getAdminDb() {
  if (!adminApp) throw new Error("Firebase Admin SDK is not configured.");
  return getFirestore(adminApp);
}
