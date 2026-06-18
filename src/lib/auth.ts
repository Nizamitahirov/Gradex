/**
 * Internal auth — username/password with a JWT in an httpOnly cookie.
 * Users live in the Firestore `users` collection (passwordHash via bcrypt).
 * Modeled on the Birtask auth flow. Server-only (Admin SDK).
 */

import "server-only";
import jwt from "jsonwebtoken";

export const AUTH_COOKIE = "gradex_token";
export const JWT_SECRET = process.env.JWT_SECRET || "gradex-dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export interface AuthPayload {
  userId: string;
  username: string;
  role: string;
  displayName: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};
