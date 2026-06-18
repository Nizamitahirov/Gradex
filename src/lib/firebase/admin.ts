/**
 * Firebase Admin SDK init — SPEC.md §3 & §11 (server-only).
 *
 * Lazy initialization: nothing runs at module load, so a bad/missing
 * credential can never crash the serverless function on import — callers get
 * a clear thrown error instead, which route handlers turn into JSON.
 *
 * Credentials resolve from either:
 *  - FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 of the full service account JSON), or
 *  - FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
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

function resolveServiceAccount(): ServiceAccount | null {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64.trim(), "base64").toString("utf8"));
    return {
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: String(json.private_key).replace(/\\n/g, "\n"),
    };
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) return { projectId, clientEmail, privateKey };
  return null;
}

export function adminEnabled(): boolean {
  try {
    return resolveServiceAccount() !== null;
  } catch {
    return false;
  }
}

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApp();
    return cachedApp;
  }
  const sa = resolveServiceAccount();
  if (!sa) {
    throw new Error(
      "Firebase Admin SDK is not configured (missing FIREBASE_SERVICE_ACCOUNT_BASE64).",
    );
  }
  cachedApp = initializeApp({ credential: cert(sa) });
  return cachedApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
