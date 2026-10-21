import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  isValidUUID,
  parseCurrency,
  assertNoInventoryPayload,
} from "@/lib/products/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/products/[id]/variants
 * Lists all variants belonging to a specific product.
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
    const { data: variants, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to retrieve variants." }, { status: 500 });
    }

    return NextResponse.json({ variants: variants ?? [] });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching variants." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products/[id]/variants
 * Creates a new variant for a product.
 * Enforces NUMERIC price validation, non-negative bounds, and no arbitrary inventory.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  const { id: productId } = await context.params;
  if (!isValidUUID(productId)) {
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

    const supabase = getSupabaseAdmin();

    // Verify parent product exists
    const { data: productExists } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();

    if (!productExists) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const {
      variant_name,
      selling_price,
      mrp,
      sku,
      is_active,
      sort_order,
      erp_product_id,
      erp_child_id,
      erp_location_code,
      erp_warehouse_code,
      erp_srate,
    } = body;

    // 1. Validate selling_price
    const priceCheck = parseCurrency(selling_price);
    if (!priceCheck.valid || priceCheck.value === undefined) {
      return NextResponse.json(
        { error: `Selling price invalid: ${priceCheck.error}` },
        { status: 400 }
      );
    }

    // 2. Validate optional MRP
    let parsedMrp: number | null = null;
    if (mrp !== undefined && mrp !== null) {
      const mrpCheck = parseCurrency(mrp);
      if (!mrpCheck.valid) {
        return NextResponse.json({ error: `MRP invalid: ${mrpCheck.error}` }, { status: 400 });
      }
      parsedMrp = mrpCheck.value ?? null;
    }

    // 3. Validate optional ERP SRate
    let parsedSrate: number | null = null;
    if (erp_srate !== undefined && erp_srate !== null) {
      const srateCheck = parseCurrency(erp_srate);
      if (!srateCheck.valid) {
        return NextResponse.json({ error: `ERP SRate invalid: ${srateCheck.error}` }, { status: 400 });
      }
      parsedSrate = srateCheck.value ?? null;
    }

    const payload = {
      product_id: productId,
      variant_name: typeof variant_name === "string" && variant_name.trim() ? variant_name.trim() : "Standard",
      selling_price: priceCheck.value,
      mrp: parsedMrp,
      sku: typeof sku === "string" && sku.trim() ? sku.trim() : null,
      is_active: typeof is_active === "boolean" ? is_active : true,
      sort_order: typeof sort_order === "number" && Number.isInteger(sort_order) ? sort_order : 0,
      erp_product_id: typeof erp_product_id === "string" && erp_product_id.trim() ? erp_product_id.trim() : null,
      erp_child_id: typeof erp_child_id === "string" && erp_child_id.trim() ? erp_child_id.trim() : null,
      erp_location_code: typeof erp_location_code === "string" && erp_location_code.trim() ? erp_location_code.trim() : null,
      erp_warehouse_code: typeof erp_warehouse_code === "string" && erp_warehouse_code.trim() ? erp_warehouse_code.trim() : null,
      erp_srate: parsedSrate,
    };

    const { data: variant, error: insertError } = await supabase
      .from("product_variants")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "A variant with this SKU already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create product variant." }, { status: 500 });
    }

    return NextResponse.json({ success: true, variant }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while creating variant." },
      { status: 500 }
    );
  }
}
