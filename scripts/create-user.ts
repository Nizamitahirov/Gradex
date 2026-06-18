/**
 * Create or update a Gradex login user in Firestore.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/create-user.ts \
 *     <username> <password> "<Display Name>" [role]
 *
 * role defaults to "admin". Passwords are bcrypt-hashed; never stored in plain.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";

function resolveServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
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

async function main() {
  const [username, password, displayName, role = "admin"] = process.argv.slice(2);
  if (!username || !password || !displayName) {
    console.error('Usage: create-user.ts <username> <password> "<Display Name>" [role]');
    process.exit(1);
  }
  const sa = resolveServiceAccount();
  if (!sa) {
    console.error("Missing service-account env (FIREBASE_SERVICE_ACCOUNT_BASE64).");
    process.exit(1);
  }
  if (!getApps().length) initializeApp({ credential: cert(sa) });
  const db = getFirestore();

  const uname = username.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert by username
  const existing = await db.collection("users").where("username", "==", uname).limit(1).get();
  const now = Date.now();
  const data = {
    username: uname,
    displayName,
    role,
    passwordHash,
    isActive: true,
    updatedAt: now,
  };

  if (existing.empty) {
    const ref = await db.collection("users").add({ ...data, createdAt: now });
    console.log(`Created user "${uname}" (${role}) — id ${ref.id}`);
  } else {
    await existing.docs[0].ref.update(data);
    console.log(`Updated user "${uname}" (${role}) — id ${existing.docs[0].id}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
