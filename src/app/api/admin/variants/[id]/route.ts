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
 * GET /api/admin/variants/[id]
 * Retrieves a single variant with parent product information.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid variant ID format." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: variant, error } = await supabase
      .from("product_variants")
      .select(
        `
        id,
        product_id,
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
        updated_at,
        product:product_id (
          id,
          name,
          slug,
          category_id
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !variant) {
      return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    }

    return NextResponse.json({ variant });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching variant." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/variants/[id]
 * Updates variant fields including price, MRP, activation state, and ERP identifiers.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid variant ID format." }, { status: 400 });
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

    if ("variant_name" in body) {
      if (typeof body.variant_name !== "string" || !body.variant_name.trim()) {
        return NextResponse.json({ error: "Variant name cannot be empty." }, { status: 400 });
      }
      updates.variant_name = body.variant_name.trim();
    }

    if ("selling_price" in body) {
      const priceCheck = parseCurrency(body.selling_price);
      if (!priceCheck.valid || priceCheck.value === undefined) {
        return NextResponse.json({ error: `Selling price invalid: ${priceCheck.error}` }, { status: 400 });
      }
      updates.selling_price = priceCheck.value;
    }

    if ("mrp" in body) {
      if (body.mrp === null || body.mrp === "") {
        updates.mrp = null;
      } else {
        const mrpCheck = parseCurrency(body.mrp);
        if (!mrpCheck.valid) {
          return NextResponse.json({ error: `MRP invalid: ${mrpCheck.error}` }, { status: 400 });
        }
        updates.mrp = mrpCheck.value;
      }
    }

    if ("erp_srate" in body) {
      if (body.erp_srate === null || body.erp_srate === "") {
        updates.erp_srate = null;
      } else {
        const srateCheck = parseCurrency(body.erp_srate);
        if (!srateCheck.valid) {
          return NextResponse.json({ error: `ERP SRate invalid: ${srateCheck.error}` }, { status: 400 });
        }
        updates.erp_srate = srateCheck.value;
      }
    }

    if ("sku" in body) {
      updates.sku = typeof body.sku === "string" && body.sku.trim() ? body.sku.trim() : null;
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

    if ("erp_product_id" in body) {
      updates.erp_product_id = typeof body.erp_product_id === "string" && body.erp_product_id.trim() ? body.erp_product_id.trim() : null;
    }

    if ("erp_child_id" in body) {
      updates.erp_child_id = typeof body.erp_child_id === "string" && body.erp_child_id.trim() ? body.erp_child_id.trim() : null;
    }

    if ("erp_location_code" in body) {
      updates.erp_location_code = typeof body.erp_location_code === "string" && body.erp_location_code.trim() ? body.erp_location_code.trim() : null;
    }

    if ("erp_warehouse_code" in body) {
      updates.erp_warehouse_code = typeof body.erp_warehouse_code === "string" && body.erp_warehouse_code.trim() ? body.erp_warehouse_code.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields provided for update." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: variant, error } = await supabase
      .from("product_variants")
      .update(updates)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A variant with this SKU already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update variant." }, { status: 500 });
    }

    if (!variant) {
      return NextResponse.json({ error: "Variant not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, variant });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred while updating variant." },
      { status: 500 }
    );
  }
}
