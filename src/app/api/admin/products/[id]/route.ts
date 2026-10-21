import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  isValidSlug,
  slugify,
  isValidImageUrl,
  isValidUUID,
  assertNoInventoryPayload,
} from "@/lib/products/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/products/[id]
 * Retrieves a single product with its category and variants.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid product ID format." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: product, error } = await supabase
      .from("products")
      .select(
        `
        id,
        category_id,
        name,
        slug,
        description,
        note,
        color,
        image_url,
        hover_image_url,
        is_active,
        sort_order,
        created_at,
        updated_at,
        category:category_id (
          id,
          name,
          slug
        ),
        variants:product_variants (
          id,
          variant_name,
          sku,
          selling_price,
          mrp,
          is_active,
          sort_order,
          erp_product_id,
          erp_child_id,
          erp_location_code,
          erp_warehouse_code,
          erp_srate,
          created_at,
          updated_at
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching product." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/products/[id]
 * Updates product details and handles activation/deactivation.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid product ID format." }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const inventoryCheck = assertNoInventoryPayload(body);
    if (!inventoryCheck.allowed) {
      return NextResponse.json({ error: inventoryCheck.error }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if ("name" in body) {
      if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 255) {
        return NextResponse.json({ error: "Product name must be between 2 and 255 characters." }, { status: 400 });
      }
      updates.name = body.name.trim();
    }

    if ("slug" in body) {
      const cleanSlug = slugify(String(body.slug));
      if (!isValidSlug(cleanSlug, 280)) {
        return NextResponse.json({ error: "Invalid slug format (2-280 lowercase alphanumeric chars with hyphens)." }, { status: 400 });
      }
      updates.slug = cleanSlug;
    }

    if ("category_id" in body) {
      if (!body.category_id || !isValidUUID(String(body.category_id))) {
        return NextResponse.json({ error: "Invalid category_id format (must be UUID)." }, { status: 400 });
      }

      // Check category exists
      const supabase = getSupabaseAdmin();
      const { data: catExists } = await supabase
        .from("product_categories")
        .select("id")
        .eq("id", body.category_id)
        .maybeSingle();

      if (!catExists) {
        return NextResponse.json({ error: "The specified category_id does not exist." }, { status: 400 });
      }

      updates.category_id = body.category_id;
    }

    if ("description" in body) {
      updates.description = typeof body.description === "string" ? body.description.trim() : null;
    }

    if ("note" in body) {
      updates.note = typeof body.note === "string" ? body.note.trim() : null;
    }

    if ("color" in body) {
      updates.color = typeof body.color === "string" && body.color.trim() ? body.color.trim() : "#f4d6bc";
    }

    if ("image_url" in body) {
      if (!isValidImageUrl(body.image_url)) {
        return NextResponse.json({ error: "Invalid image_url format." }, { status: 400 });
      }
      updates.image_url = String(body.image_url).trim();
    }

    if ("hover_image_url" in body) {
      if (body.hover_image_url !== null && body.hover_image_url !== "" && !isValidImageUrl(body.hover_image_url)) {
        return NextResponse.json({ error: "Invalid hover_image_url format." }, { status: 400 });
      }
      updates.hover_image_url = typeof body.hover_image_url === "string" && body.hover_image_url.trim() ? body.hover_image_url.trim() : null;
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
    const { data: product, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A product with this slug already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while updating product." },
      { status: 500 }
    );
  }
}
