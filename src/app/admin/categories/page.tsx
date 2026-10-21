"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New Category Modal / Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit Category Modal State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function loadCategories() {
    setLoading(true);
    fetch("/api/admin/categories")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.categories) {
          setCategories(data.categories);
        }
      })
      .catch(() => {
        showToast("Error loading categories");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create category.");
        setSubmitting(false);
        return;
      }

      setCategories((prev) => [...prev, data.category]);
      setShowAddModal(false);
      setName("");
      setSlug("");
      setDescription("");
      setImageUrl("");
      setSortOrder(0);
      setIsActive(true);
      showToast("Category created successfully");
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEditedCategory(e: FormEvent) {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    setSavingEdit(true);

    const payload = {
      name: editingCategory.name.trim(),
      slug: editingCategory.slug.trim(),
      description: editingCategory.description ? editingCategory.description.trim() : null,
      image_url: editingCategory.image_url ? editingCategory.image_url.trim() : null,
      sort_order: Number(editingCategory.sort_order) || 0,
      is_active: editingCategory.is_active,
    };

    try {
      const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update category.");
        setSavingEdit(false);
        return;
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? data.category : c))
      );
      setEditingCategory(null);
      showToast("Category updated");
    } catch {
      alert("Error updating category.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleCategoryStatus(cat: Category) {
    const nextStatus = !cat.is_active;
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (!res.ok) {
        showToast("Failed to update status");
        return;
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: nextStatus } : c))
      );
      showToast(nextStatus ? `Activated "${cat.name}"` : `Deactivated "${cat.name}"`);
    } catch {
      showToast("Error updating category");
    }
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">CATALOG CLASSIFICATION</span>
          <h1 className="admin-title">CATEGORIES</h1>
        </div>
        <div className="admin-header-actions">
          <button
            onClick={() => {
              setError(null);
              setShowAddModal(true);
            }}
            className="admin-btn admin-btn-solid"
          >
            + New Category
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-card">
          <div className="admin-spinner" />
          <span>Loading categories...</span>
        </div>
      ) : categories.length === 0 ? (
        <section className="admin-empty-state-card">
          <div className="admin-empty-icon">📁</div>
          <h2>No Categories Created</h2>
          <p>
            Categories organize the storefront shelves (e.g. Grocery, Snacks, Pet Care, Personal Care). Create your first category to get started.
          </p>
          <div className="admin-empty-actions">
            <button
              onClick={() => {
                setError(null);
                setShowAddModal(true);
              }}
              className="admin-btn admin-btn-solid"
            >
              + Create First Category
            </button>
          </div>
        </section>
      ) : (
        <section className="admin-section-card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Sort Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <div className="admin-cat-cell">
                        {cat.image_url && (
                          <img
                            src={cat.image_url}
                            alt=""
                            className="admin-cat-thumb"
                          />
                        )}
                        <strong>{cat.name}</strong>
                      </div>
                    </td>
                    <td className="admin-cell-sub">/{cat.slug}</td>
                    <td className="admin-cell-sub">{cat.description || "—"}</td>
                    <td className="admin-cell-sub">{cat.sort_order}</td>
                    <td>
                      <button
                        onClick={() => toggleCategoryStatus(cat)}
                        className={`admin-status-toggle ${cat.is_active ? "status-active" : "status-inactive"}`}
                      >
                        {cat.is_active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => setEditingCategory({ ...cat })}
                        className="admin-action-btn"
                      >
                        Edit ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* New Category Modal */}
      {showAddModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Create New Category</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="admin-modal-form">
              <div className="admin-form-grid">
                <div className="admin-field-group span-2">
                  <label htmlFor="catName">Category Name *</label>
                  <input
                    id="catName"
                    type="text"
                    required
                    placeholder="e.g. Grocery, Snacks, Home"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group span-2">
                  <label htmlFor="catSlug">
                    URL Slug <span className="admin-hint">(optional, auto-generated if blank)</span>
                  </label>
                  <input
                    id="catSlug"
                    type="text"
                    placeholder="e.g. grocery"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group span-2">
                  <label htmlFor="catDesc">Description</label>
                  <textarea
                    id="catDesc"
                    rows={2}
                    placeholder="Brief description for category..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="admin-textarea"
                  />
                </div>

                <div className="admin-field-group">
                  <label htmlFor="catImg">Banner / Icon Image URL</label>
                  <input
                    id="catImg"
                    type="text"
                    placeholder="/categories/grocery.png"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label htmlFor="catSort">Sort Order</label>
                  <input
                    id="catSort"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group admin-checkbox-group span-2">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span>Active &amp; available in store navigation</span>
                  </label>
                </div>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="admin-btn admin-btn-solid"
                >
                  {submitting ? "Creating..." : "Create Category ↗"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="admin-modal-backdrop" onClick={() => setEditingCategory(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Edit Category: {editingCategory.name}</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setEditingCategory(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEditedCategory} className="admin-modal-form">
              <div className="admin-form-grid">
                <div className="admin-field-group span-2">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, name: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group span-2">
                  <label>URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.slug}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, slug: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group span-2">
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={editingCategory.description || ""}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, description: e.target.value })
                    }
                    className="admin-textarea"
                  />
                </div>

                <div className="admin-field-group">
                  <label>Banner / Icon Image URL</label>
                  <input
                    type="text"
                    value={editingCategory.image_url || ""}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, image_url: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>Sort Order</label>
                  <input
                    type="number"
                    value={editingCategory.sort_order}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        sort_order: Number(e.target.value),
                      })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group admin-checkbox-group span-2">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingCategory.is_active}
                      onChange={(e) =>
                        setEditingCategory({ ...editingCategory, is_active: e.target.checked })
                      }
                    />
                    <span>Active in store navigation</span>
                  </label>
                </div>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="admin-btn admin-btn-solid"
                >
                  {savingEdit ? "Saving..." : "Save Changes ↗"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast} <span>✓</span>
        </div>
      )}
    </div>
  );
}
