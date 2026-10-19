import crypto from "crypto";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const SESSION_COOKIE_NAME = "tfs_session";
export const SESSION_DURATION_DAYS = 14;

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  created_at: string;
  updated_at: string;
}

export interface SessionData {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

export interface SessionValidationResult {
  user: SafeUser;
  session: SessionData;
}

/**
 * Generates a high-entropy cryptographically random session token (256 bits).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hashes a session token using SHA-256 for secure database storage.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a new session in PostgreSQL and attaches the raw token as an HTTP-only cookie.
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sessions").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to persist session: ${error.message}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Validates a session token (either passed directly or read from HTTP-only cookie).
 * Verifies that the session exists, is not revoked, has not expired, and the user is ACTIVE.
 */
export async function validateSession(rawToken?: string): Promise<SessionValidationResult | null> {
  let token = rawToken;

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const supabase = getSupabaseAdmin();

  // Query session joined with the users table
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .select(`
      id,
      user_id,
      expires_at,
      revoked_at,
      created_at,
      last_used_at,
      users:user_id (
        id,
        name,
        email,
        role,
        status,
        created_at,
        updated_at
      )
    `)
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .single();

  if (sessionError || !sessionData) {
    return null;
  }

  // Check expiration
  if (new Date(sessionData.expires_at).getTime() < Date.now()) {
    return null;
  }

  const user = sessionData.users as unknown as SafeUser;
  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  // Update last_used_at lazily if older than 1 hour
  const lastUsedTime = new Date(sessionData.last_used_at).getTime();
  if (Date.now() - lastUsedTime > 60 * 60 * 1000) {
    await supabase
      .from("sessions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", sessionData.id);
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    session: {
      id: sessionData.id,
      user_id: sessionData.user_id,
      expires_at: sessionData.expires_at,
      created_at: sessionData.created_at,
      last_used_at: sessionData.last_used_at,
    },
  };
}

/**
 * Revokes the current session in PostgreSQL and clears the session cookie.
 */
export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);
    const supabase = getSupabaseAdmin();
    await supabase
      .from("sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Convenience helper to get the currently authenticated user in Server Components / Routes.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const result = await validateSession();
  return result?.user ?? null;
}
