import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  generateOAuthState,
  generatePKCE,
  getGoogleAuthorizationUrl,
} from "@/lib/auth/google";
import { getSafeRedirectUrl } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  try {
    const rawRedirect = request.nextUrl.searchParams.get("redirect");
    const safeRedirect = getSafeRedirectUrl(rawRedirect, "/");

    const state = generateOAuthState();
    const { codeVerifier, codeChallenge } = generatePKCE();
    const authUrl = getGoogleAuthorizationUrl(state, codeChallenge);

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    // Set short-lived HTTP-only cookies for state, PKCE verifier, and return destination (10 minutes)
    cookieStore.set("g_oauth_state", state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    cookieStore.set("g_oauth_verifier", codeVerifier, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });

    if (safeRedirect !== "/") {
      cookieStore.set("g_oauth_redirect", safeRedirect, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
    }

    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initialize Google Sign In.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }
}
