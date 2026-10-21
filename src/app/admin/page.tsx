import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = getSupabaseAdmin();

  // Fetch real counts concurrently
  const [
    { count: totalProducts },
    { count: activeProducts },
    { count: totalCategories },
    { count: totalVariants },
    { data: recentProducts },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("product_categories").select("*", { count: "exact", head: true }),
    supabase.from("product_variants").select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id, name, slug, color, image_url, is_active, created_at, category:category_id(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const prodCount = totalProducts ?? 0;
  const activeCount = activeProducts ?? 0;
  const catCount = totalCategories ?? 0;
  const varCount = totalVariants ?? 0;

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">STORE MANAGEMENT</span>
          <h1 className="admin-title">DASHBOARD OVERVIEW</h1>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin/categories" className="admin-btn">
            Categories
          </Link>
          <Link href="/admin/products/new" className="admin-btn admin-btn-solid">
            + New Product
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-label">Total Products</span>
          <strong className="admin-stat-value">{prodCount}</strong>
          <span className="admin-stat-sub">
            {activeCount} active · {prodCount - activeCount} draft/hidden
          </span>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-label">Active on Shelves</span>
          <strong className="admin-stat-value">{activeCount}</strong>
          <span className="admin-stat-sub">Visible to customers in storefront</span>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-label">Categories</span>
          <strong className="admin-stat-value">{catCount}</strong>
          <span className="admin-stat-sub">
            <Link href="/admin/categories" className="admin-link">
              Manage shelves ↗
            </Link>
          </span>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-label">Sellable Variants</span>
          <strong className="admin-stat-value">{varCount}</strong>
          <span className="admin-stat-sub">Pack sizes &amp; ERP SKU mappings</span>
        </div>
      </div>

      {/* Catalog State */}
      {prodCount === 0 ? (
        <section className="admin-empty-state-card" aria-labelledby="empty-catalog-heading">
          <div className="admin-empty-icon">📦</div>
          <h2 id="empty-catalog-heading">Database Catalog is Empty</h2>
          <p>
            Your production product tables in Supabase currently contain 0 verified records. Mock catalog products from development are intentionally isolated and not imported into the production database.
          </p>
          <div className="admin-empty-actions">
            {catCount === 0 ? (
              <Link href="/admin/categories" className="admin-btn admin-btn-solid">
                Create First Category ↗
              </Link>
            ) : (
              <Link href="/admin/products/new" className="admin-btn admin-btn-solid">
                Create First Product ↗
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="admin-section-card">
          <div className="admin-section-head">
            <h2>Recently Added Products</h2>
            <Link href="/admin/products" className="admin-link">
              View All ({prodCount}) ↗
            </Link>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts?.map((product: any) => {
                  const categoryName = Array.isArray(product.category)
                    ? product.category[0]?.name
                    : product.category?.name || "Uncategorized";

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-prod-cell">
                          <img
                            src={product.image_url || "/product-placeholder.svg"}
                            alt=""
                            className="admin-prod-thumb"
                          />
                          <div>
                            <strong>{product.name}</strong>
                            <span className="admin-cell-sub">/{product.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td>{categoryName}</td>
                      <td>
                        <span className={`admin-status-badge ${product.is_active ? "status-active" : "status-inactive"}`}>
                          {product.is_active ? "Active" : "Draft"}
                        </span>
                      </td>
                      <td className="admin-cell-date">
                        {new Date(product.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <Link href={`/admin/products/${product.id}`} className="admin-action-btn">
                          Edit ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* RanceLab ERP Architecture Note */}
      <div className="admin-notice-box">
        <span className="eyebrow">RANCELAB FR6 INTEGRATION NOTICE</span>
        <p>
          Product details (names, descriptions, pack sizes, selling prices) are managed here. Live inventory quantities and warehouse snapshots remain isolated in <code>inventory_snapshots</code> and will be synchronized from RanceLab ERP in Step 10.
        </p>
      </div>
    </div>
  );
}
