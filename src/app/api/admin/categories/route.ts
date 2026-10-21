import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { isValidSlug, slugify, isValidImageUrl } from "@/lib/products/validation";

/**
 * GET /api/admin/categories
 * Lists all product categories ordered by sort_order and name.
 * Strictly requires ADMIN session.
 */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: categories, error } = await supabase
      .from("product_categories")
      .select("id, name, slug, description, image_url, is_active, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to retrieve product categories." },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: categories ?? [] });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching categories." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/categories
 * Creates a new product category.
 * Strictly requires ADMIN session.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { name, slug, description, image_url, is_active, sort_order } = body;

    // 1. Validate name
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { error: "Category name is required (2 to 100 characters)." },
        { status: 400 }
      );
    }
    const cleanName = name.trim();

    // 2. Resolve and validate slug
    const resolvedSlug = (typeof slug === "string" && slug.trim()) ? slugify(slug) : slugify(cleanName);
    if (!isValidSlug(resolvedSlug, 120)) {
      return NextResponse.json(
        { error: "Invalid slug format. Slugs must contain only lowercase letters, numbers, and hyphens (2 to 120 chars)." },
        { status: 400 }
      );
    }

    // 3. Optional fields
    if (image_url && !isValidImageUrl(image_url)) {
      return NextResponse.json(
        { error: "Invalid image URL format." },
        { status: 400 }
      );
    }

    const payload = {
      name: cleanName,
      slug: resolvedSlug,
      description: typeof description === "string" ? description.trim() : null,
      image_url: typeof image_url === "string" ? image_url.trim() : null,
      is_active: typeof is_active === "boolean" ? is_active : true,
      sort_order: typeof sort_order === "number" && Number.isInteger(sort_order) ? sort_order : 0,
    };

    const supabase = getSupabaseAdmin();
    const { data: category, error } = await supabase
      .from("product_categories")
      .insert(payload)
      .select("id, name, slug, description, image_url, is_active, sort_order, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `A category with the slug '${resolvedSlug}' already exists.` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create category." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while creating category." },
      { status: 500 }
    );
  }
}
