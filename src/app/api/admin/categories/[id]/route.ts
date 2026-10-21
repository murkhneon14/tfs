import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { isValidSlug, slugify, isValidImageUrl, isValidUUID } from "@/lib/products/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/categories/[id]
 * Retrieves a single category by UUID.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid category ID format." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: category, error } = await supabase
      .from("product_categories")
      .select("id, name, slug, description, image_url, is_active, sort_order, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !category) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching category." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/categories/[id]
 * Updates category fields and handles activation/deactivation.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid category ID format." }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if ("name" in body) {
      if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 100) {
        return NextResponse.json({ error: "Category name must be between 2 and 100 characters." }, { status: 400 });
      }
      updates.name = body.name.trim();
    }

    if ("slug" in body) {
      const cleanSlug = slugify(String(body.slug));
      if (!isValidSlug(cleanSlug, 120)) {
        return NextResponse.json({ error: "Invalid slug format (2 to 120 alphanumeric chars with hyphens)." }, { status: 400 });
      }
      updates.slug = cleanSlug;
    }

    if ("description" in body) {
      updates.description = typeof body.description === "string" ? body.description.trim() : null;
    }

    if ("image_url" in body) {
      if (body.image_url !== null && body.image_url !== "" && !isValidImageUrl(body.image_url)) {
        return NextResponse.json({ error: "Invalid image URL format." }, { status: 400 });
      }
      updates.image_url = typeof body.image_url === "string" && body.image_url.trim() ? body.image_url.trim() : null;
    }

    if ("is_active" in body) {
      if (typeof body.is_active !== "boolean") {
        return NextResponse.json({ error: "Field 'is_active' must be a boolean." }, { status: 400 });
      }
      updates.is_active = body.is_active;
    }

    if ("sort_order" in body) {
      if (typeof body.sort_order !== "number" || !Number.isInteger(body.sort_order)) {
        return NextResponse.json({ error: "Field 'sort_order' must be an integer." }, { status: 400 });
      }
      updates.sort_order = body.sort_order;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided for update." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: category, error } = await supabase
      .from("product_categories")
      .update(updates)
      .eq("id", id)
      .select("id, name, slug, description, image_url, is_active, sort_order, created_at, updated_at")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A category with this slug already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
    }

    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, category });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while updating category." },
      { status: 500 }
    );
  }
}
