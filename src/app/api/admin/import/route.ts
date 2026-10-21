import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { runDryRun, runCatalogImport } from "@/lib/products/rancelab-import";

/**
 * GET /api/admin/import
 * Returns dry-run comparison between RanceLab source and Supabase PostgreSQL.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const stats = await runDryRun();
    return NextResponse.json({
      success: true,
      dryRun: true,
      stats,
    });
  } catch (error: any) {
    console.error("Admin import dry-run failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute import dry-run" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/import
 * Executes live catalog import or dry-run based on request body.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;

    if (dryRun) {
      const stats = await runDryRun();
      return NextResponse.json({
        success: true,
        dryRun: true,
        stats,
      });
    }

    await runCatalogImport();
    return NextResponse.json({
      success: true,
      dryRun: false,
      message: "RanceLab product catalog successfully imported into Supabase.",
    });
  } catch (error: any) {
    console.error("Admin import execution failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Catalog import execution failed" },
      { status: 500 }
    );
  }
}
