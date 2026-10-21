"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

const PRESET_COLORS = ["#f4d6bc", "#dfd0bd", "#d8c9bd", "#eee0c9", "#e7d9d2", "#ecd4ac", "#f2d9ad", "#d9e4e2", "#e5d2cc", "#d8dfd0", "#d2e4df", "#e3dfce"];

export default function NewProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState("#f4d6bc");
  const [imageUrl, setImageUrl] = useState("");
  const [hoverImageUrl, setHoverImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  // Initial Variant Fields
  const [variantName, setVariantName] = useState("Standard");
  const [sellingPrice, setSellingPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [sku, setSku] = useState("");

  // RanceLab Mapping Fields (Collapsible)
  const [showErpSection, setShowErpSection] = useState(false);
  const [erpProductId, setErpProductId] = useState("");
  const [erpChildId, setErpChildId] = useState("");
  const [erpLocationCode, setErpLocationCode] = useState("");
  const [erpWarehouseCode, setErpWarehouseCode] = useState("");
  const [erpSrate, setErpSrate] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    if (!imageUrl.trim()) {
      setError("Main product image URL is required (e.g. /products/example.png).");
      return;
    }

    if (!sellingPrice.trim()) {
      setError("Initial variant selling price is required.");
      return;
    }

    const priceNum = Number(sellingPrice.trim());
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Selling price must be a valid non-negative number.");
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      category_id: categoryId,
      description: description.trim() || undefined,
      note: note.trim() || undefined,
      color: color || "#f4d6bc",
      image_url: imageUrl.trim(),
      hover_image_url: hoverImageUrl.trim() || undefined,
      is_active: isActive,
      sort_order: Number(sortOrder) || 0,
      initial_variant: {
        variant_name: variantName.trim() || "Standard",
        selling_price: sellingPrice.trim(),
        mrp: mrp.trim() || undefined,
        sku: sku.trim() || undefined,
        erp_product_id: erpProductId.trim() || undefined,
        erp_child_id: erpChildId.trim() || undefined,
        erp_location_code: erpLocationCode.trim() || undefined,
        erp_warehouse_code: erpWarehouseCode.trim() || undefined,
        erp_srate: erpSrate.trim() || undefined,
      },
    };

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create product.");
        setSubmitting(false);
        return;
      }

      router.push(`/admin/products/${data.product.id}`);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form-card" noValidate>
      {error && (
        <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Section 1: Core Details */}
      <fieldset className="admin-fieldset">
        <legend className="admin-legend">1. Core Product Information</legend>

        <div className="admin-form-grid">
          <div className="admin-field-group span-2">
            <label htmlFor="name">Product Name *</label>
            <input
              id="name"
              type="text"
              required
              placeholder="e.g. 2X Hot & Spicy Maggi"
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
            <label htmlFor="slug">
              URL Slug <span className="admin-hint">(optional, auto-generated if blank)</span>
            </label>
            <input
              id="slug"
              type="text"
              placeholder="e.g. hot-spicy-maggi"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="admin-field-group span-2">
            <label htmlFor="note">
              Editorial Note / Tagline <span className="admin-hint">(shown in detail view)</span>
            </label>
            <input
              id="note"
              type="text"
              placeholder="e.g. A familiar favourite, ready for your everyday"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="admin-field-group span-2">
            <label htmlFor="description">Product Description</label>
            <textarea
              id="description"
              rows={3}
              placeholder="Detailed description, ingredients, or usage instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="admin-textarea"
            />
          </div>
        </div>
      </fieldset>

      {/* Section 2: Visual Styling & Images */}
      <fieldset className="admin-fieldset">
        <legend className="admin-legend">2. Storefront Imagery &amp; Card Tint</legend>

        <div className="admin-form-grid">
          <div className="admin-field-group">
            <label htmlFor="imageUrl">Main Image URL *</label>
            <input
              id="imageUrl"
              type="text"
              required
              placeholder="/products/dates.png or https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="admin-field-group">
            <label htmlFor="hoverImageUrl">
              Hover Image URL <span className="admin-hint">(optional second photo)</span>
            </label>
            <input
              id="hoverImageUrl"
              type="text"
              placeholder="/products/dates-alt.png"
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
                placeholder="#f4d6bc"
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

      {/* Section 3: Initial Variant & Pricing */}
      <fieldset className="admin-fieldset">
        <legend className="admin-legend">3. Initial Sellable Variant</legend>

        <div className="admin-form-grid">
          <div className="admin-field-group">
            <label htmlFor="variantName">Variant / Pack Size *</label>
            <input
              id="variantName"
              type="text"
              required
              placeholder="e.g. Standard, 500g, Pack of 4"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="admin-field-group">
            <label htmlFor="sellingPrice">Selling Price (₹) *</label>
            <input
              id="sellingPrice"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="e.g. 175.00"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="admin-field-group">
            <label htmlFor="mrp">
              MRP (₹) <span className="admin-hint">(optional)</span>
            </label>
            <input
              id="mrp"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 199.00"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              className="admin-input"
            />
          </div>

          <div className="admin-field-group">
            <label htmlFor="sku">
              SKU / Barcode <span className="admin-hint">(optional)</span>
            </label>
            <input
              id="sku"
              type="text"
              placeholder="e.g. SKU-DATES-500G"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="admin-input"
            />
          </div>
        </div>

        {/* Collapsible RanceLab ERP Mapping */}
        <div className="admin-collapsible-group">
          <button
            type="button"
            className="admin-collapsible-btn"
            onClick={() => setShowErpSection(!showErpSection)}
          >
            <span>{showErpSection ? "▼" : "▶"} RanceLab FR6 Mapping Identifiers (Optional)</span>
            <span className="admin-hint">Pre-configure ERP links for Step 10 sync</span>
          </button>

          {showErpSection && (
            <div className="admin-form-grid admin-collapsible-body">
              <div className="admin-field-group">
                <label htmlFor="erpProductId">RanceLab ProductID</label>
                <input
                  id="erpProductId"
                  type="text"
                  placeholder="e.g. 000124 (preserves leading zeros)"
                  value={erpProductId}
                  onChange={(e) => setErpProductId(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="admin-field-group">
                <label htmlFor="erpChildId">RanceLab ChildID</label>
                <input
                  id="erpChildId"
                  type="text"
                  placeholder="e.g. 01"
                  value={erpChildId}
                  onChange={(e) => setErpChildId(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="admin-field-group">
                <label htmlFor="erpLocationCode">RanceLab LocationCode</label>
                <input
                  id="erpLocationCode"
                  type="text"
                  placeholder="e.g. STORE01"
                  value={erpLocationCode}
                  onChange={(e) => setErpLocationCode(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="admin-field-group">
                <label htmlFor="erpWarehouseCode">RanceLab WarehouseCode</label>
                <input
                  id="erpWarehouseCode"
                  type="text"
                  placeholder="e.g. WH01"
                  value={erpWarehouseCode}
                  onChange={(e) => setErpWarehouseCode(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="admin-field-group">
                <label htmlFor="erpSrate">Reference ERP SRate (₹)</label>
                <input
                  id="erpSrate"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 170.00"
                  value={erpSrate}
                  onChange={(e) => setErpSrate(e.target.value)}
                  className="admin-input"
                />
              </div>
            </div>
          )}
        </div>
      </fieldset>

      {/* Section 4: Publishing Settings */}
      <fieldset className="admin-fieldset">
        <legend className="admin-legend">4. Publishing &amp; Sort Order</legend>

        <div className="admin-form-grid">
          <div className="admin-field-group">
            <label htmlFor="sortOrder">Sort Order (lower numbers appear first)</label>
            <input
              id="sortOrder"
              type="number"
              step="1"
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
              <span>Active &amp; published to customer storefront</span>
            </label>
          </div>
        </div>
      </fieldset>

      <div className="admin-form-actions">
        <Link href="/admin/products" className="admin-btn">
          Cancel
        </Link>
        <button type="submit" disabled={submitting} className="admin-btn admin-btn-solid">
          {submitting ? "Saving Product..." : "Create Product ↗"}
        </button>
      </div>
    </form>
  );
}
