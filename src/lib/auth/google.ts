import crypto from "crypto";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";

let googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  if (googleClient) return googleClient;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google";

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.");
  }

  googleClient = new OAuth2Client(clientId, clientSecret, redirectUri);
  return googleClient;
}

/**
 * Generates PKCE code_verifier and code_challenge
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

/**
 * Generates anti-CSRF state token
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates the Google OAuth 2.0 authorization URL
 */
export function getGoogleAuthorizationUrl(state: string, codeChallenge: string): string {
  const client = getGoogleClient();

  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: "select_account",
  });
}

export interface GoogleUserPayload {
  sub: string;
  email: string;
  name: string;
}

/**
 * Exchanges authorization code for tokens and verifies the Google ID token server-side.
 */
export async function verifyGoogleAuthorizationCode(
  code: string,
  codeVerifier: string
): Promise<GoogleUserPayload> {
  const client = getGoogleClient();
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Exchange code for tokens
  const { tokens } = await client.getToken({
    code,
    codeVerifier,
  });

  if (!tokens.id_token) {
    throw new Error("Google response did not include an id_token.");
  }

  // Verify the ID token using Google's public keys
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Google ID token is missing required subject or email claims.");
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name || payload.email.split("@")[0],
  };
}
