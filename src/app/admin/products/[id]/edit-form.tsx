"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Variant {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string | null;
  selling_price: number | string;
  mrp: number | string | null;
  is_active: boolean;
  sort_order: number;
  erp_product_id: string | null;
  erp_child_id: string | null;
  erp_location_code: string | null;
  erp_warehouse_code: string | null;
  erp_srate: number | string | null;
  created_at: string;
}

export interface ProductDetail {
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
  variants?: Variant[];
}

const PRESET_COLORS = ["#f4d6bc", "#dfd0bd", "#d8c9bd", "#eee0c9", "#e7d9d2", "#ecd4ac", "#f2d9ad", "#d9e4e2", "#e5d2cc", "#d8dfd0", "#d2e4df", "#e3dfce"];

export default function EditProductForm({
  initialProduct,
  categories,
}: {
  initialProduct: ProductDetail;
  categories: Category[];
}) {
  const [product, setProduct] = useState<ProductDetail>(initialProduct);
  const [variants, setVariants] = useState<Variant[]>(initialProduct.variants || []);
  const [savingProduct, setSavingProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(initialProduct.name);
  const [slug, setSlug] = useState(initialProduct.slug);
  const [categoryId, setCategoryId] = useState(initialProduct.category_id);
  const [description, setDescription] = useState(initialProduct.description || "");
  const [note, setNote] = useState(initialProduct.note || "");
  const [color, setColor] = useState(initialProduct.color || "#f4d6bc");
  const [imageUrl, setImageUrl] = useState(initialProduct.image_url || "");
  const [hoverImageUrl, setHoverImageUrl] = useState(initialProduct.hover_image_url || "");
  const [isActive, setIsActive] = useState(initialProduct.is_active);
  const [sortOrder, setSortOrder] = useState(initialProduct.sort_order || 0);

  // New Variant Modal / Form State
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newVarName, setNewVarName] = useState("");
  const [newVarPrice, setNewVarPrice] = useState("");
  const [newVarMrp, setNewVarMrp] = useState("");
  const [newVarSku, setNewVarSku] = useState("");
  const [newVarErpProdId, setNewVarErpProdId] = useState("");
  const [newVarErpChildId, setNewVarErpChildId] = useState("");
  const [newVarErpLoc, setNewVarErpLoc] = useState("");
  const [newVarErpWh, setNewVarErpWh] = useState("");
  const [newVarErpSrate, setNewVarErpSrate] = useState("");
  const [savingNewVariant, setSavingNewVariant] = useState(false);

  // Edit Existing Variant Modal
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [savingEditVariant, setSavingEditVariant] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSaveProduct(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingProduct(true);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      category_id: categoryId,
      description: description.trim() || null,
      note: note.trim() || null,
      color: color || "#f4d6bc",
      image_url: imageUrl.trim(),
      hover_image_url: hoverImageUrl.trim() || null,
      is_active: isActive,
      sort_order: Number(sortOrder) || 0,
    };

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update product.");
        setSavingProduct(false);
        return;
      }

      showToast("Product details saved successfully");
      setProduct((prev) => ({ ...prev, ...payload }));
    } catch {
      setError("Unable to save product.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleCreateVariant(e: FormEvent) {
    e.preventDefault();
    if (!newVarName.trim() || !newVarPrice.trim()) {
      alert("Variant name and price are required.");
      return;
    }

    setSavingNewVariant(true);

    const payload = {
      variant_name: newVarName.trim(),
      selling_price: newVarPrice.trim(),
      mrp: newVarMrp.trim() || undefined,
      sku: newVarSku.trim() || undefined,
      erp_product_id: newVarErpProdId.trim() || undefined,
      erp_child_id: newVarErpChildId.trim() || undefined,
      erp_location_code: newVarErpLoc.trim() || undefined,
      erp_warehouse_code: newVarErpWh.trim() || undefined,
      erp_srate: newVarErpSrate.trim() || undefined,
    };

    try {
      const res = await fetch(`/api/admin/products/${product.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create variant.");
        setSavingNewVariant(false);
        return;
      }

      setVariants((prev) => [...prev, data.variant]);
      setShowAddVariant(false);
      setNewVarName("");
      setNewVarPrice("");
      setNewVarMrp("");
      setNewVarSku("");
      setNewVarErpProdId("");
      setNewVarErpChildId("");
      setNewVarErpLoc("");
      setNewVarErpWh("");
      setNewVarErpSrate("");
      showToast("New variant added");
    } catch {
      alert("Error creating variant.");
    } finally {
      setSavingNewVariant(false);
    }
  }

  async function handleSaveEditedVariant(e: FormEvent) {
    e.preventDefault();
    if (!editingVariant) return;

    setSavingEditVariant(true);

    const payload = {
      variant_name: editingVariant.variant_name,
      selling_price: editingVariant.selling_price,
      mrp: editingVariant.mrp || null,
      sku: editingVariant.sku || null,
      is_active: editingVariant.is_active,
      erp_product_id: editingVariant.erp_product_id || null,
      erp_child_id: editingVariant.erp_child_id || null,
      erp_location_code: editingVariant.erp_location_code || null,
      erp_warehouse_code: editingVariant.erp_warehouse_code || null,
      erp_srate: editingVariant.erp_srate || null,
    };

    try {
      const res = await fetch(`/api/admin/variants/${editingVariant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update variant.");
        setSavingEditVariant(false);
        return;
      }

      setVariants((prev) =>
        prev.map((v) => (v.id === editingVariant.id ? data.variant : v))
      );
      setEditingVariant(null);
      showToast("Variant updated");
    } catch {
      alert("Error updating variant.");
    } finally {
      setSavingEditVariant(false);
    }
  }

  async function toggleVariantStatus(v: Variant) {
    const nextStatus = !v.is_active;
    try {
      const res = await fetch(`/api/admin/variants/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (!res.ok) {
        showToast("Failed to toggle variant status");
        return;
      }

      setVariants((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, is_active: nextStatus } : item))
      );
      showToast(nextStatus ? `Activated "${v.variant_name}"` : `Deactivated "${v.variant_name}"`);
    } catch {
      showToast("Error updating variant");
    }
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/products" className="admin-back-crumb">
            ← Back to Products
          </Link>
          <h1 className="admin-title">EDIT PRODUCT</h1>
          <span className="admin-cell-sub">ID: {product.id}</span>
        </div>
        <div className="admin-header-actions">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`admin-status-toggle ${isActive ? "status-active" : "status-inactive"}`}
          >
            {isActive ? "Status: Active" : "Status: Draft"}
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Product Edit Form */}
      <form onSubmit={handleSaveProduct} className="admin-form-card" noValidate>
        <fieldset className="admin-fieldset">
          <legend className="admin-legend">1. Product Information</legend>

          <div className="admin-form-grid">
            <div className="admin-field-group span-2">
              <label htmlFor="name">Product Name *</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-field-group">
              <label htmlFor="categoryId">Category *</label>
              <select
                id="categoryId"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="admin-select"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field-group">
              <label htmlFor="slug">URL Slug *</label>
              <input
                id="slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-field-group span-2">
              <label htmlFor="note">Editorial Note / Tagline</label>
              <input
                id="note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-field-group span-2">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="admin-textarea"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend className="admin-legend">2. Imagery &amp; Card Tint</legend>

          <div className="admin-form-grid">
            <div className="admin-field-group">
              <label htmlFor="imageUrl">Main Image URL *</label>
              <input
                id="imageUrl"
                type="text"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-field-group">
              <label htmlFor="hoverImageUrl">Hover Image URL</label>
              <input
                id="hoverImageUrl"
                type="text"
                value={hoverImageUrl}
                onChange={(e) => setHoverImageUrl(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-field-group span-2">
              <label>Mosaic Card Tint Color</label>
              <div className="admin-color-picker-row">
                <div className="admin-color-preview" style={{ backgroundColor: color }} />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="admin-input admin-color-hex"
                />
                <div className="admin-color-presets">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`admin-swatch ${color === c ? "selected" : ""}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="admin-fieldset">
          <legend className="admin-legend">3. Publishing &amp; Sort Order</legend>

          <div className="admin-form-grid">
            <div className="admin-field-group">
              <label htmlFor="sortOrder">Sort Order</label>
              <input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="admin-input"
              />
            </div>

            <div className="admin-field-group admin-checkbox-group">
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Active &amp; published in customer store</span>
              </label>
            </div>
          </div>
        </fieldset>

        <div className="admin-form-actions">
          <button type="submit" disabled={savingProduct} className="admin-btn admin-btn-solid">
            {savingProduct ? "Saving Changes..." : "Save Product Details ↗"}
          </button>
        </div>
      </form>

      {/* Variants Section */}
      <section className="admin-section-card" style={{ marginTop: 35 }}>
        <div className="admin-section-head">
          <div>
            <h2>Sellable Variants ({variants.length})</h2>
            <p className="admin-cell-sub">
              Manage different pack sizes, sellable prices, and optional RanceLab ERP mapping identifiers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddVariant(true)}
            className="admin-btn admin-btn-solid"
          >
            + Add Variant
          </button>
        </div>

        {variants.length === 0 ? (
          <div className="admin-empty-state-card" style={{ padding: 30 }}>
            <h3>No Variants Added</h3>
            <p>Every product must have at least one sellable variant.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Variant Name</th>
                  <th>SKU</th>
                  <th>Selling Price</th>
                  <th>MRP</th>
                  <th>ERP Identifiers</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.variant_name}</strong>
                    </td>
                    <td className="admin-cell-sub">{v.sku || "—"}</td>
                    <td className="admin-cell-price">₹{Number(v.selling_price).toFixed(2)}</td>
                    <td className="admin-cell-sub">
                      {v.mrp ? `₹${Number(v.mrp).toFixed(2)}` : "—"}
                    </td>
                    <td>
                      {v.erp_product_id ? (
                        <span className="admin-erp-tag" title="RanceLab Product / Child / Loc / Wh">
                          ERP #{v.erp_product_id}
                          {v.erp_child_id ? `:${v.erp_child_id}` : ""}
                          {v.erp_location_code ? ` @ ${v.erp_location_code}` : ""}
                          {v.erp_warehouse_code ? ` (${v.erp_warehouse_code})` : ""}
                        </span>
                      ) : (
                        <span className="admin-cell-sub">Unmapped</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleVariantStatus(v)}
                        className={`admin-status-toggle ${v.is_active ? "status-active" : "status-inactive"}`}
                      >
                        {v.is_active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setEditingVariant({ ...v })}
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
        )}
      </section>

      {/* Add Variant Modal */}
      {showAddVariant && (
        <div className="admin-modal-backdrop" onClick={() => setShowAddVariant(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Add Sellable Variant</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowAddVariant(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateVariant} className="admin-modal-form">
              <div className="admin-form-grid">
                <div className="admin-field-group">
                  <label>Variant / Pack Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500g, Pack of 4"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 99.50"
                    value={newVarPrice}
                    onChange={(e) => setNewVarPrice(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 120.00"
                    value={newVarMrp}
                    onChange={(e) => setNewVarMrp(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>SKU / Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. SKU-500G"
                    value={newVarSku}
                    onChange={(e) => setNewVarSku(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP ProductID</label>
                  <input
                    type="text"
                    placeholder="e.g. 000451"
                    value={newVarErpProdId}
                    onChange={(e) => setNewVarErpProdId(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP ChildID</label>
                  <input
                    type="text"
                    placeholder="e.g. 01"
                    value={newVarErpChildId}
                    onChange={(e) => setNewVarErpChildId(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP Location Code</label>
                  <input
                    type="text"
                    placeholder="e.g. STORE01"
                    value={newVarErpLoc}
                    onChange={(e) => setNewVarErpLoc(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP Warehouse Code</label>
                  <input
                    type="text"
                    placeholder="e.g. WH01"
                    value={newVarErpWh}
                    onChange={(e) => setNewVarErpWh(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP SRate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 95.00"
                    value={newVarErpSrate}
                    onChange={(e) => setNewVarErpSrate(e.target.value)}
                    className="admin-input"
                  />
                </div>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setShowAddVariant(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewVariant}
                  className="admin-btn admin-btn-solid"
                >
                  {savingNewVariant ? "Saving..." : "Add Variant ↗"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Existing Variant Modal */}
      {editingVariant && (
        <div className="admin-modal-backdrop" onClick={() => setEditingVariant(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Edit Variant: {editingVariant.variant_name}</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setEditingVariant(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveEditedVariant} className="admin-modal-form">
              <div className="admin-form-grid">
                <div className="admin-field-group">
                  <label>Variant Name *</label>
                  <input
                    type="text"
                    required
                    value={editingVariant.variant_name}
                    onChange={(e) =>
                      setEditingVariant({ ...editingVariant, variant_name: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingVariant.selling_price}
                    onChange={(e) =>
                      setEditingVariant({ ...editingVariant, selling_price: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingVariant.mrp || ""}
                    onChange={(e) =>
                      setEditingVariant({
                        ...editingVariant,
                        mrp: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>SKU / Barcode</label>
                  <input
                    type="text"
                    value={editingVariant.sku || ""}
                    onChange={(e) =>
                      setEditingVariant({ ...editingVariant, sku: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP ProductID</label>
                  <input
                    type="text"
                    value={editingVariant.erp_product_id || ""}
                    onChange={(e) =>
                      setEditingVariant({ ...editingVariant, erp_product_id: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP ChildID</label>
                  <input
                    type="text"
                    value={editingVariant.erp_child_id || ""}
                    onChange={(e) =>
                      setEditingVariant({ ...editingVariant, erp_child_id: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP Location Code</label>
                  <input
                    type="text"
                    value={editingVariant.erp_location_code || ""}
                    onChange={(e) =>
                      setEditingVariant({ ...editingVariant, erp_location_code: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP Warehouse Code</label>
                  <input
                    type="text"
                    value={editingVariant.erp_warehouse_code || ""}
                    onChange={(e) =>
                      setEditingVariant({ ...editingVariant, erp_warehouse_code: e.target.value })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group">
                  <label>ERP SRate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingVariant.erp_srate || ""}
                    onChange={(e) =>
                      setEditingVariant({
                        ...editingVariant,
                        erp_srate: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="admin-input"
                  />
                </div>

                <div className="admin-field-group admin-checkbox-group span-2">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingVariant.is_active}
                      onChange={(e) =>
                        setEditingVariant({ ...editingVariant, is_active: e.target.checked })
                      }
                    />
                    <span>Active variant (available for checkout when in stock)</span>
                  </label>
                </div>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => setEditingVariant(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditVariant}
                  className="admin-btn admin-btn-solid"
                >
                  {savingEditVariant ? "Saving..." : "Save Variant ↗"}
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
