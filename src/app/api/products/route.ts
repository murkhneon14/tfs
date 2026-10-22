import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const categorySlug = searchParams.get("category")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "36", 10)), 100);
    const offset = (page - 1) * limit;

    const supabase = getSupabaseAdmin();

    // 1. Fetch categories for frontend filter bar
    const { data: categories } = await supabase
      .from("product_categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    // 2. Build product query
    let query = supabase
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        note,
        color,
        image_url,
        hover_image_url,
        is_active,
        sort_order,
        category:product_categories!inner(id, name, slug),
        variants:product_variants!inner(id, variant_name, sku, selling_price, mrp, is_active)
      `,
        { count: "exact" }
      )
      .eq("is_active", true)
      .eq("variants.is_active", true)
      .gt("variants.selling_price", 0);

    // Apply category filter if specified
    if (categorySlug && categorySlug !== "all") {
      query = query.eq("category.slug", categorySlug);
    }

    // Apply search filter if specified
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // Order and paginate
    query = query
      .order("sort_order", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: rawProducts, error, count } = await query;

    if (error) {
      console.error("Failed to query public products:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map into frontend format
    const products = (rawProducts || []).map((p: any) => {
      const categoryName = Array.isArray(p.category)
        ? p.category[0]?.name
        : p.category?.name || "Grocery";

      const variants = Array.isArray(p.variants) ? p.variants : [];
      const primaryVariant = variants[0];
      const price = primaryVariant ? Number(primaryVariant.selling_price) : 0;

      return {
        id: p.id,
        name: p.name,
        category: categoryName,
        price,
        stock: null,
        inventorySyncPending: true,
        image: p.image_url || "/product-placeholder.svg",
        hoverImage: p.hover_image_url || undefined,
        note: p.note || (variants.length > 1 ? `${variants.length} options` : "Everyday Grocery"),
        color: p.color || "#f4d6bc",
        slug: p.slug,
        variants: variants.map((v: any) => ({
          id: v.id,
          variantName: v.variant_name,
          sellingPrice: Number(v.selling_price),
          mrp: Number(v.mrp),
          sku: v.sku,
        })),
      };
    });

    return NextResponse.json({
      products,
      categories: categories || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error("Public products API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
