"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Variant {
  id: string;
  variant_name: string;
  sku: string | null;
  selling_price: number | string;
  mrp: number | string | null;
  is_active: boolean;
}

interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  note: string | null;
  color: string;
  image_url: string;
  hover_image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  category?: Category | Category[] | null;
  variants?: Variant[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Load categories and initial products
  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  function loadProducts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (selectedCategory) params.set("categoryId", selectedCategory);
    if (statusFilter === "active") params.set("isActive", "true");
    if (statusFilter === "inactive") params.set("isActive", "false");

    fetch(`/api/admin/products?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.products) {
          setProducts(data.products);
        }
      })
      .catch(() => {
        showToast("Error loading products");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, statusFilter]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function toggleProductStatus(product: Product) {
    const nextStatus = !product.is_active;
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (!res.ok) {
        showToast("Failed to update status");
        return;
      }

      startTransition(() => {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, is_active: nextStatus } : p))
        );
      });
      showToast(nextStatus ? `Activated "${product.name}"` : `Deactivated "${product.name}"`);
    } catch {
      showToast("Error updating status");
    }
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">CATALOG ADMINISTRATION</span>
          <h1 className="admin-title">PRODUCTS</h1>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin/products/new" className="admin-btn admin-btn-solid">
            + New Product
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-wrap">
          <input
            type="search"
            placeholder="Search products by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          {search && (
            <button className="admin-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
              ×
            </button>
          )}
        </div>

        <div className="admin-filter-controls">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="admin-select"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="admin-select"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Draft / Inactive</option>
          </select>
        </div>
      </div>

      {/* Product Table / Empty States */}
      {loading ? (
        <div className="admin-loading-card">
          <div className="admin-spinner" />
          <span>Loading products...</span>
        </div>
      ) : products.length === 0 ? (
        <section className="admin-empty-state-card">
          <div className="admin-empty-icon">🏷️</div>
          <h2>No Products Found</h2>
          <p>
            {search || selectedCategory || statusFilter !== "all"
              ? "No products match your current search and filter criteria."
              : "No verified products exist in the database yet. Create your first product below."}
          </p>
          <div className="admin-empty-actions">
            {search || selectedCategory || statusFilter !== "all" ? (
              <button
                className="admin-btn"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </button>
            ) : (
              <Link href="/admin/products/new" className="admin-btn admin-btn-solid">
                + Create First Product
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="admin-section-card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Variants</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const categoryName = Array.isArray(product.category)
                    ? product.category[0]?.name
                    : product.category?.name || "Uncategorized";

                  const variantCount = product.variants?.length ?? 0;
                  const prices = product.variants?.map((v) => Number(v.selling_price)) ?? [];
                  const minPrice = prices.length ? Math.min(...prices) : null;
                  const maxPrice = prices.length ? Math.max(...prices) : null;

                  const priceDisplay =
                    minPrice === null
                      ? "No price set"
                      : minPrice === maxPrice
                      ? `₹${minPrice.toFixed(2)}`
                      : `₹${minPrice.toFixed(2)} – ₹${maxPrice?.toFixed(2)}`;

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
                            <Link href={`/admin/products/${product.id}`} className="admin-prod-title-link">
                              <strong>{product.name}</strong>
                            </Link>
                            <span className="admin-cell-sub">
                              /{product.slug} {product.note && `· ${product.note}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="admin-cat-pill">{categoryName}</span>
                      </td>
                      <td>
                        <span className="admin-variant-count">
                          {variantCount} {variantCount === 1 ? "variant" : "variants"}
                        </span>
                      </td>
                      <td className="admin-cell-price">{priceDisplay}</td>
                      <td>
                        <button
                          onClick={() => toggleProductStatus(product)}
                          className={`admin-status-toggle ${product.is_active ? "status-active" : "status-inactive"}`}
                          title="Click to toggle active status"
                        >
                          {product.is_active ? "Active" : "Draft"}
                        </button>
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

      {toast && (
        <div className="toast" role="status">
          {toast} <span>✓</span>
        </div>
      )}
    </div>
  );
}
