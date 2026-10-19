import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { name, email, password, confirmPassword } = body;

    // 1. Validate and sanitize name
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { error: "Please enter your name (2 to 100 characters)." },
        { status: 400 }
      );
    }
    const sanitizedName = name.trim();

    // 2. Validate and normalize email
    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Validate password match and strength
    if (typeof password !== "string" || typeof confirmPassword !== "string") {
      return NextResponse.json(
        { error: "Password and confirmation are required." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error || "Password does not meet requirements." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 4. Check for existing normalized email
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    // 5. Hash password with bcryptjs (salt rounds 12)
    const passwordHash = await hashPassword(password);

    // 6. Create user record strictly with CUSTOMER role
    // Client-supplied roles or overrides are explicitly ignored
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        name: sanitizedName,
        email: normalizedEmail,
        role: "CUSTOMER", // Mandatory: always CUSTOMER
        status: "ACTIVE",
      })
      .select("id, name, email, role, status, created_at, updated_at")
      .single();

    if (userError || !newUser) {
      // Check unique constraint violation error code
      if (userError?.code === "23505") {
        return NextResponse.json(
          { error: "An account with this email address already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Unable to create your account at this time. Please try again." },
        { status: 500 }
      );
    }

    // 7. Store password credentials in isolated table
    const { error: credsError } = await supabase
      .from("password_credentials")
      .insert({
        user_id: newUser.id,
        password_hash: passwordHash,
        algorithm: "bcrypt",
      });

    if (credsError) {
      // Clean up orphaned user row if credentials failed to insert
      await supabase.from("users").delete().eq("id", newUser.id);
      return NextResponse.json(
        { error: "Failed to store account credentials securely. Please try again." },
        { status: 500 }
      );
    }

    // 8. Create session and set HTTP-only cookie
    await createSession(newUser.id);

    return NextResponse.json(
      {
        success: true,
        user: newUser,
        message: "Account created successfully.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
