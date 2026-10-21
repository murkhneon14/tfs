import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/products/validation";
import EditProductForm, { type Category, type ProductDetail } from "./edit-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return (
      <div className="admin-page-container">
        <div className="admin-empty-state-card">
          <h2>Invalid Product ID</h2>
          <p>The product identifier provided is malformed.</p>
          <div className="admin-empty-actions">
            <Link href="/admin/products" className="admin-btn admin-btn-solid">
              ← Return to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = getSupabaseAdmin();

  // Load product and categories in parallel
  const [productRes, categoriesRes] = await Promise.all([
    supabase
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
        variants:product_variants (
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
          created_at
        )
      `
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("product_categories")
      .select("id, name, slug")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const product = productRes.data as unknown as ProductDetail | null;
  const categories = (categoriesRes.data ?? []) as Category[];

  if (!product) {
    return (
      <div className="admin-page-container">
        <div className="admin-empty-state-card">
          <h2>Product Not Found</h2>
          <p>The product you requested does not exist or has been removed.</p>
          <div className="admin-empty-actions">
            <Link href="/admin/products" className="admin-btn admin-btn-solid">
              ← Return to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <EditProductForm initialProduct={product} categories={categories} />;
}
