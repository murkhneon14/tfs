import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  isValidSlug,
  slugify,
  isValidImageUrl,
  isValidUUID,
  parseCurrency,
  assertNoInventoryPayload,
} from "@/lib/products/validation";

/**
 * GET /api/admin/products
 * Lists products with joined category and variant details.
 * Supports search, category filter, active status filter, and pagination.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const categoryId = searchParams.get("categoryId")?.trim();
    const isActiveParam = searchParams.get("isActive");
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50", 10)), 100);
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const supabase = getSupabaseAdmin();
    let query = supabase
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
          erp_product_id,
          erp_child_id,
          erp_location_code,
          erp_warehouse_code,
          erp_srate,
          created_at,
          updated_at
        )
      `,
        { count: "exact" }
      );

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (categoryId && isValidUUID(categoryId)) {
      query = query.eq("category_id", categoryId);
    }

    if (isActiveParam === "true") {
      query = query.eq("is_active", true);
    } else if (isActiveParam === "false") {
      query = query.eq("is_active", false);
    }

    const { data: products, count, error } = await query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: "Failed to query products." }, { status: 500 });
    }

    return NextResponse.json({
      products: products ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while listing products." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products
 * Creates a new product and an optional initial variant.
 * Enforces strict validation, foreign key checks, and rejects arbitrary stock manipulation.
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

    // Security check: reject arbitrary inventory manipulation through catalog API
    const inventoryCheck = assertNoInventoryPayload(body);
    if (!inventoryCheck.allowed) {
      return NextResponse.json({ error: inventoryCheck.error }, { status: 400 });
    }

    const {
      name,
      slug,
      category_id,
      description,
      note,
      color,
      image_url,
      hover_image_url,
      is_active,
      sort_order,
      initial_variant,
    } = body;

    // 1. Validate name
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 255) {
      return NextResponse.json(
        { error: "Product name is required (2 to 255 characters)." },
        { status: 400 }
      );
    }
    const cleanName = name.trim();

    // 2. Validate category_id
    if (!category_id || !isValidUUID(category_id)) {
      return NextResponse.json(
        { error: "A valid category_id (UUID) is required." },
        { status: 400 }
      );
    }

    // 3. Resolve and validate slug
    const resolvedSlug = (typeof slug === "string" && slug.trim()) ? slugify(slug) : slugify(cleanName);
    if (!isValidSlug(resolvedSlug, 280)) {
      return NextResponse.json(
        { error: "Invalid slug format. Must be 2-280 lowercase alphanumeric characters with hyphens." },
        { status: 400 }
      );
    }

    // 4. Validate image_url
    if (!image_url || !isValidImageUrl(image_url)) {
      return NextResponse.json(
        { error: "A valid main product image_url is required (relative path or http/https)." },
        { status: 400 }
      );
    }

    if (hover_image_url && !isValidImageUrl(hover_image_url)) {
      return NextResponse.json(
        { error: "Invalid hover_image_url format." },
        { status: 400 }
      );
    }

    // 5. Validate initial variant if provided
    let parsedInitialVariant: {
      variant_name: string;
      selling_price: number;
      mrp: number | null;
      sku: string | null;
      erp_product_id: string | null;
      erp_child_id: string | null;
      erp_location_code: string | null;
      erp_warehouse_code: string | null;
      erp_srate: number | null;
    } | null = null;

    if (initial_variant && typeof initial_variant === "object") {
      const variantInventoryCheck = assertNoInventoryPayload(initial_variant);
      if (!variantInventoryCheck.allowed) {
        return NextResponse.json({ error: variantInventoryCheck.error }, { status: 400 });
      }

      const priceCheck = parseCurrency(initial_variant.selling_price);
      if (!priceCheck.valid || priceCheck.value === undefined) {
        return NextResponse.json(
          { error: `Initial variant price invalid: ${priceCheck.error}` },
          { status: 400 }
        );
      }

      let parsedMrp: number | null = null;
      if (initial_variant.mrp !== undefined && initial_variant.mrp !== null) {
        const mrpCheck = parseCurrency(initial_variant.mrp);
        if (!mrpCheck.valid) {
          return NextResponse.json({ error: `Initial variant MRP invalid: ${mrpCheck.error}` }, { status: 400 });
        }
        parsedMrp = mrpCheck.value ?? null;
      }

      let parsedSrate: number | null = null;
      if (initial_variant.erp_srate !== undefined && initial_variant.erp_srate !== null) {
        const srateCheck = parseCurrency(initial_variant.erp_srate);
        if (!srateCheck.valid) {
          return NextResponse.json({ error: `ERP SRate invalid: ${srateCheck.error}` }, { status: 400 });
        }
        parsedSrate = srateCheck.value ?? null;
      }

      parsedInitialVariant = {
        variant_name: typeof initial_variant.variant_name === "string" && initial_variant.variant_name.trim()
          ? initial_variant.variant_name.trim()
          : "Standard",
        selling_price: priceCheck.value,
        mrp: parsedMrp,
        sku: typeof initial_variant.sku === "string" && initial_variant.sku.trim() ? initial_variant.sku.trim() : null,
        erp_product_id: typeof initial_variant.erp_product_id === "string" && initial_variant.erp_product_id.trim() ? initial_variant.erp_product_id.trim() : null,
        erp_child_id: typeof initial_variant.erp_child_id === "string" && initial_variant.erp_child_id.trim() ? initial_variant.erp_child_id.trim() : null,
        erp_location_code: typeof initial_variant.erp_location_code === "string" && initial_variant.erp_location_code.trim() ? initial_variant.erp_location_code.trim() : null,
        erp_warehouse_code: typeof initial_variant.erp_warehouse_code === "string" && initial_variant.erp_warehouse_code.trim() ? initial_variant.erp_warehouse_code.trim() : null,
        erp_srate: parsedSrate,
      };
    }

    const supabase = getSupabaseAdmin();

    // Verify category exists
    const { data: categoryExists } = await supabase
      .from("product_categories")
      .select("id")
      .eq("id", category_id)
      .maybeSingle();

    if (!categoryExists) {
      return NextResponse.json(
        { error: "The specified category_id does not exist." },
        { status: 400 }
      );
    }

    const productPayload = {
      name: cleanName,
      slug: resolvedSlug,
      category_id,
      description: typeof description === "string" ? description.trim() : null,
      note: typeof note === "string" ? note.trim() : null,
      color: typeof color === "string" && color.trim() ? color.trim() : "#f4d6bc",
      image_url: image_url.trim(),
      hover_image_url: typeof hover_image_url === "string" && hover_image_url.trim() ? hover_image_url.trim() : null,
      is_active: typeof is_active === "boolean" ? is_active : true,
      sort_order: typeof sort_order === "number" && Number.isInteger(sort_order) ? sort_order : 0,
    };

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert(productPayload)
      .select("*")
      .single();

    if (productError || !product) {
      if (productError?.code === "23505") {
        return NextResponse.json(
          { error: `A product with the slug '${resolvedSlug}' already exists.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
    }

    let createdVariant = null;
    if (parsedInitialVariant) {
      const { data: variantData, error: variantError } = await supabase
        .from("product_variants")
        .insert({
          product_id: product.id,
          ...parsedInitialVariant,
        })
        .select("*")
        .single();

      if (variantError) {
        // Rollback product insertion if initial variant creation fails
        await supabase.from("products").delete().eq("id", product.id);
        if (variantError.code === "23505") {
          return NextResponse.json({ error: "A variant with this SKU already exists." }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create initial product variant." }, { status: 500 });
      }
      createdVariant = variantData;
    }

    return NextResponse.json(
      {
        success: true,
        product: {
          ...product,
          variants: createdVariant ? [createdVariant] : [],
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while creating product." },
      { status: 500 }
    );
  }
}
