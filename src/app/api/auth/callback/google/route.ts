import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyGoogleAuthorizationCode } from "@/lib/auth/google";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createSession } from "@/lib/auth/session";
import { getSafeRedirectUrl } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // Handle Google user cancellation or error
  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google sign in was cancelled or denied.")}`, baseUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Missing authorization code or state from Google.")}`, baseUrl)
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("g_oauth_state")?.value;
  const codeVerifier = cookieStore.get("g_oauth_verifier")?.value;
  const storedRedirect = cookieStore.get("g_oauth_redirect")?.value;

  // Clean up temporary OAuth cookies immediately
  cookieStore.delete("g_oauth_state");
  cookieStore.delete("g_oauth_verifier");
  cookieStore.delete("g_oauth_redirect");

  // Anti-CSRF verification
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Invalid authentication state. Please try again.")}`, baseUrl)
    );
  }

  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("OAuth session expired. Please try signing in again.")}`, baseUrl)
    );
  }

  try {
    // Exchange code and verify Google ID token
    const googleUser = await verifyGoogleAuthorizationCode(code, codeVerifier);
    const supabase = getSupabaseAdmin();

    let targetUserId: string | null = null;

    // 1. Check if this Google sub is already linked
    const { data: existingGoogleIdentity } = await supabase
      .from("google_identities")
      .select("user_id")
      .eq("google_sub", googleUser.sub)
      .maybeSingle();

    if (existingGoogleIdentity) {
      targetUserId = existingGoogleIdentity.user_id;
    } else {
      // 2. Check if a user already exists with this email
      const { data: existingUserByEmail } = await supabase
        .from("users")
        .select("id, status")
        .eq("email", googleUser.email)
        .maybeSingle();

      if (existingUserByEmail) {
        // Security: Prevent automatic account takeover of an existing password-based account
        const { data: passwordCreds } = await supabase
          .from("password_credentials")
          .select("user_id")
          .eq("user_id", existingUserByEmail.id)
          .maybeSingle();

        if (passwordCreds) {
          return NextResponse.redirect(
            new URL(
              `/login?error=${encodeURIComponent(
                "An account with this email already exists with password sign-in. Please sign in using your email and password."
              )}`,
              baseUrl
            )
          );
        }

        targetUserId = existingUserByEmail.id;
        // Link Google identity to the existing account if not a password account
        await supabase.from("google_identities").insert({
          user_id: targetUserId,
          google_sub: googleUser.sub,
        });
      } else {
        // 3. Create a brand new user strictly with CUSTOMER role
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            name: googleUser.name,
            email: googleUser.email,
            role: "CUSTOMER", // Mandatory customer role
            status: "ACTIVE",
          })
          .select("id")
          .single();

        if (createError || !newUser) {
          throw new Error("Failed to create customer account.");
        }

        targetUserId = newUser.id;

        // Link Google identity
        await supabase.from("google_identities").insert({
          user_id: targetUserId,
          google_sub: googleUser.sub,
        });
      }
    }

    if (!targetUserId) {
      throw new Error("Unable to identify or create customer account.");
    }

    // Verify account status
    const { data: account } = await supabase
      .from("users")
      .select("status")
      .eq("id", targetUserId)
      .single();

    if (!account || account.status !== "ACTIVE") {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("Your account is disabled. Please contact support.")}`, baseUrl)
      );
    }

    // 4. Create session and set HTTP-only cookie
    await createSession(targetUserId);

    // Redirect to safe destination (e.g. checkout, account, or storefront)
    const targetPath = getSafeRedirectUrl(storedRedirect, "/");
    return NextResponse.redirect(new URL(targetPath, baseUrl));
  } catch {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Google authentication failed. Please try again.")}`, baseUrl)
    );
  }
}
