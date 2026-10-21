import { NextResponse } from "next/server";
import { getCurrentUser, type SafeUser } from "./session";

export type AdminAuthResult =
  | { authorized: true; user: SafeUser }
  | { authorized: false; response: NextResponse };

/**
 * Validates that the incoming request has a valid server-side session
 * and that the user record in PostgreSQL holds the 'ADMIN' role.
 *
 * Security:
 * - Never trusts client-supplied roles, query params, or headers.
 * - Resolves identity strictly via cryptographic session token hash in DB.
 * - Returns a ready-to-return NextResponse (401 or 403) on authorization failure.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden: Administrator privileges required." },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}
