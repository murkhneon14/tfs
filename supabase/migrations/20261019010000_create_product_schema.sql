-- ==============================================================================
-- Migration: 20261019010000_create_product_schema.sql
-- Description: Core product catalog schema with RanceLab ERP mapping fields
-- Scope: product_categories, products, product_variants, inventory_snapshots
-- Note: Zero seed/mock data. Prepared strictly for production store catalog.
-- ==============================================================================

-- 1. PRODUCT CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT product_categories_slug_unique UNIQUE (slug),
  CONSTRAINT product_categories_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT product_categories_slug_not_empty CHECK (char_length(trim(slug)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON public.product_categories(slug);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order ON public.product_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON public.product_categories(is_active);

CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL,
  description TEXT,
  note TEXT,
  color VARCHAR(30) DEFAULT '#f4d6bc',
  image_url TEXT NOT NULL,
  hover_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT products_slug_unique UNIQUE (slug),
  CONSTRAINT products_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT products_slug_not_empty CHECK (char_length(trim(slug)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products(sort_order);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name VARCHAR(100) NOT NULL DEFAULT 'Standard',
  sku VARCHAR(100),
  selling_price NUMERIC(10, 2) NOT NULL,
  mrp NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- RanceLab FR6 Mapping Identifiers (Alphanumeric strings preserving leading zeros)
  -- Note: No unverified uniqueness constraint is placed on ERP mapping codes
  erp_product_id VARCHAR(50),
  erp_child_id VARCHAR(50),
  erp_location_code VARCHAR(50),
  erp_warehouse_code VARCHAR(50),
  erp_srate NUMERIC(10, 2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT product_variants_selling_price_non_negative CHECK (selling_price >= 0),
  CONSTRAINT product_variants_mrp_non_negative CHECK (mrp IS NULL OR mrp >= 0),
  CONSTRAINT product_variants_erp_srate_non_negative CHECK (erp_srate IS NULL OR erp_srate >= 0),
  CONSTRAINT product_variants_sku_unique UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_erp_composite ON public.product_variants(erp_product_id, erp_child_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_erp_location ON public.product_variants(erp_location_code);
CREATE INDEX IF NOT EXISTS idx_product_variants_erp_warehouse ON public.product_variants(erp_warehouse_code);
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON public.product_variants(is_active);

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. INVENTORY SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  location_code VARCHAR(50) NOT NULL DEFAULT 'DEFAULT',
  warehouse_code VARCHAR(50),

  -- Quantity is NULL when stock has not yet been verified. Unverified is NOT treated as 0 stock.
  erp_quantity NUMERIC(12, 3),

  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  review_required BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT inventory_snapshots_sync_status_check CHECK (
    sync_status IN ('PENDING', 'SYNCED', 'FLAGGED', 'STALE')
  ),
  CONSTRAINT inventory_snapshots_erp_quantity_check CHECK (
    erp_quantity IS NULL OR erp_quantity >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_variant ON public.inventory_snapshots(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_location ON public.inventory_snapshots(location_code);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_warehouse ON public.inventory_snapshots(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_sync_status ON public.inventory_snapshots(sync_status);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_review ON public.inventory_snapshots(review_required) WHERE review_required = TRUE;

CREATE TRIGGER update_inventory_snapshots_updated_at
  BEFORE UPDATE ON public.inventory_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
