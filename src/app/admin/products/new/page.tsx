import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import NewProductForm, { type Category } from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = getSupabaseAdmin();
  const { data: categoriesData } = await supabase
    .from("product_categories")
    .select("id, name, slug")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories = (categoriesData ?? []) as Category[];

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/products" className="admin-back-crumb">
            ← Back to Products
          </Link>
          <h1 className="admin-title">NEW PRODUCT</h1>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="admin-empty-state-card">
          <div className="admin-empty-icon">📁</div>
          <h2>No Categories Available</h2>
          <p>You must create at least one category before adding products.</p>
          <div className="admin-empty-actions">
            <Link href="/admin/categories" className="admin-btn admin-btn-solid">
              Create Category First ↗
            </Link>
          </div>
        </div>
      ) : (
        <NewProductForm categories={categories} />
      )}
    </div>
  );
}
