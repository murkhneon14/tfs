import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Determine client identifier for rate limiting (IP + Email)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateLimitKey = `login:${ip}:${normalizedEmail}`;

    // Check rate limit: 5 attempts per 15 minutes
    const rateLimitStatus = checkRateLimit(rateLimitKey);
    if (!rateLimitStatus.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please wait ${rateLimitStatus.retryAfterSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Query user by normalized email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, email, role, status, created_at, updated_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Query password credentials
    let credentials = null;
    if (user) {
      const { data: credsData } = await supabase
        .from("password_credentials")
        .select("password_hash")
        .eq("user_id", user.id)
        .maybeSingle();
      credentials = credsData;
    }

    // Generic error message if user or credentials not found
    if (userError || !user || !credentials?.password_hash) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Verify password hash
    const isValidPassword = await verifyPassword(password, credentials.password_hash);
    if (!isValidPassword) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check if account is active
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account is currently disabled or suspended. Please contact support." },
        { status: 403 }
      );
    }

    // Reset rate limiter on successful authentication
    resetRateLimit(rateLimitKey);

    // Create session and set HTTP-only cookie
    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      message: "Signed in successfully.",
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred during sign in." },
      { status: 500 }
    );
  }
}
