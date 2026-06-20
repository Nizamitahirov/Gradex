/**
 * Job Description records with full version history.
 * Stored per-company at orgs/{orgId}/jds/{jdId} with a `versions` subcollection.
 * Every edit/rewrite appends a new immutable version and bumps currentVersion.
 */

import "server-only";
import type { AuthPayload } from "@/lib/auth";

export interface CreateJdInput {
  title: string;
  jobTitle?: string;
  content: string;
  source: "ai" | "upload" | "manual";
  jobId?: string | null;
  note?: string;
}

/** Create a JD with its first version. Returns the new doc id. */
export async function createJdRecord(
  orgRef: FirebaseFirestore.DocumentReference,
  actor: AuthPayload,
  input: CreateJdInput,
): Promise<string> {
  const now = Date.now();
  const ref = await orgRef.collection("jds").add({
    title: input.title,
    jobTitle: input.jobTitle ?? input.title,
    content: input.content,
    source: input.source,
    jobId: input.jobId ?? null,
    currentVersion: 1,
    createdBy: actor.userId,
    createdByName: actor.displayName,
    createdAt: now,
    updatedAt: now,
  });
  await ref.collection("versions").add({
    version: 1,
    content: input.content,
    note: input.note ?? "Created",
    source: input.source,
    createdBy: actor.userId,
    createdByName: actor.displayName,
    createdAt: now,
  });
  return ref.id;
}

/** Append a new version and update the JD's current content. */
export async function addJdVersion(
  jdRef: FirebaseFirestore.DocumentReference,
  actor: AuthPayload,
  content: string,
  note: string,
  source: "ai" | "upload" | "manual" = "manual",
): Promise<number> {
  const snap = await jdRef.get();
  const current = (snap.data()?.currentVersion as number) ?? 0;
  const next = current + 1;
  const now = Date.now();
  await jdRef.collection("versions").add({
    version: next,
    content,
    note,
    source,
    createdBy: actor.userId,
    createdByName: actor.displayName,
    createdAt: now,
  });
  await jdRef.update({ content, currentVersion: next, updatedAt: now });
  return next;
}
