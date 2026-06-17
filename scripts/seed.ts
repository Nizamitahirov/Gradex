/**
 * Firestore seed script — SPEC.md §18.
 *
 * Pushes the demo organization (families, jobs, evaluations, activity) into a
 * real Firestore project using the Admin SDK, so the structure grid and
 * dashboards look alive in a connected environment.
 *
 * Usage:  FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... npm run seed
 *
 * In demo mode (no env), the app seeds the browser store automatically and you
 * do not need this script.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildSeed, DEMO_USER } from "../src/lib/demo/seed";

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.");
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  const db = getFirestore();

  const { org, families, jobs, evaluations, members, activity } = buildSeed();
  const orgRef = db.collection("orgs").doc(org.id);

  console.log(`Seeding org "${org.name}" (${org.id})…`);
  await orgRef.set(org);

  await db.collection("users").doc(DEMO_USER.uid).set({
    email: DEMO_USER.email,
    displayName: DEMO_USER.displayName,
    photoURL: DEMO_USER.photoURL,
    createdAt: Date.now(),
    lastActiveOrgId: org.id,
    memberships: { [org.id]: "admin" },
  });

  for (const m of members) await orgRef.collection("members").doc(m.userId).set(m);
  for (const f of families) await orgRef.collection("families").doc(f.id).set(f);
  for (const j of jobs) await orgRef.collection("jobs").doc(j.id).set(j);
  for (const e of evaluations) {
    const jobId = jobs[evaluations.indexOf(e)].id;
    await orgRef.collection("jobs").doc(jobId).collection("evaluations").doc(e.id).set(e);
  }
  for (const a of activity) await orgRef.collection("activity").doc(a.id).set(a);

  console.log(`Done: ${families.length} families, ${jobs.length} jobs, ${evaluations.length} evaluations.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
