import { NextResponse, type NextRequest } from "next/server";
import { revokeCurrentSession } from "@/lib/auth/session";

export async function POST() {
  try {
    await revokeCurrentSession();
    return NextResponse.json({ success: true, message: "Signed out successfully." });
  } catch {
    return NextResponse.json(
      { error: "An error occurred while signing out." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await revokeCurrentSession();
  } catch {}
  return NextResponse.redirect(new URL("/", request.url));
}
