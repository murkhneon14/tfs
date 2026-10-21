import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface RanceCategory {
  ProductGroupID: string;
  ProductGroupName: string;
  IsActive: string;
}

export interface RanceProduct {
  ProductID: string;
  ProductName: string;
  PrintName: string;
  Barcode: string;
  ProductGroupID: string;
  IsActive: string;
}

export interface RanceVariant {
  ProductID: string;
  ChildID: string;
  LocationCode: string;
  ProductChildID: string;
  MRP: string;
  SellingPrice: string;
  Barcode: string;
}

export interface ImportStats {
  categories: {
    totalSource: number;
    toInsert: number;
    toUpdate: number;
    skipped: number;
  };
  products: {
    totalSource: number;
    toInsert: number;
    toUpdate: number;
    skipped: number;
  };
  variants: {
    totalSource: number;
    toInsert: number;
    toUpdate: number;
    skipped: number;
    flaggedZeroPrice: number;
  };
  summary: {
    productsWithVariants: number;
    productsWithoutVariants: number;
    zeroSellablePrices: number;
    leadingZerosPreserved: boolean;
  };
}

export function slugifyCategory(name: string): string {
  if (name.trim().toLowerCase() === "[none]") {
    return "general";
  }
  return name
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function slugifyProduct(name: string, productId: string): string {
  const base = name
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/&/g, "and")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `${base || "product"}-${productId}`;
}

async function executeRanceQuery<T>(query: string): Promise<T[]> {
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetJsonDataForJScript xmlns="http://tempuri.org/">
      <queryString><![CDATA[${query}]]></queryString>
    </GetJsonDataForJScript>
  </soap:Body>
</soap:Envelope>`;

  const res = await fetch("http://ser2.rlab9.com:6433/FR6", {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": "http://tempuri.org/IServiceMobi/GetJsonDataForJScript",
    },
    body: soapEnvelope,
  });

  if (!res.ok) {
    throw new Error(`RanceLab SOAP call failed with status ${res.status}`);
  }

  const text = await res.text();
  const match = text.match(/<GetJsonDataForJScriptResult>([\s\S]*?)<\/GetJsonDataForJScriptResult>/);
  if (!match || !match[1]) {
    return [];
  }

  const raw = match[1].trim();
  if (raw === "[]" || raw.length === 0) {
    return [];
  }

  if (raw.startsWith("[{") && raw.endsWith("}]")) {
    const inner = raw.slice(2, -2);
    const objects = inner.split("},{");
    const parsed: T[] = [];
    for (let i = 0; i < objects.length; i++) {
      const wrapped = "{" + objects[i] + "}";
      const objStr = wrapped.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      try {
        parsed.push(JSON.parse(objStr));
      } catch (err) {
        console.warn(`Failed to parse object at index ${i}:`, objStr);
      }
    }
    return parsed;
  }

  return [];
}

export async function fetchRanceLabData() {
  const queryGroups = `
    SELECT
      ProductGroupID,
      REPLACE(REPLACE(ProductGroupName, '\\', ' '), '"', '') AS ProductGroupName,
      IsActive
    FROM ProductGroupMaster
    ORDER BY ProductGroupID ASC
  `;

  const queryProducts = `
    SELECT
      pm.ProductID,
      REPLACE(REPLACE(pm.ProductName, '\\', ' '), '"', '') AS ProductName,
      REPLACE(REPLACE(pm.PrintName, '\\', ' '), '"', '') AS PrintName,
      pm.UPCEAN AS Barcode,
      pm.ProductGroupID,
      pm.IsActive
    FROM ProductMaster pm
    ORDER BY pm.ProductID ASC
  `;

  const queryVariants = `
    SELECT
      pcm.ProductID,
      pcm.ChildID,
      pcm.LocationCode,
      pcm.ProductChildID,
      pcm.MRP,
      pcm.SellingPrice,
      pm.UPCEAN AS Barcode
    FROM ProductChildMaster pcm
    JOIN ProductMaster pm ON pcm.ProductID = pm.ProductID
    ORDER BY pcm.ProductID ASC, pcm.ChildID ASC
  `;

  console.log("Fetching RanceLab groups, products, and child variants...");
  const [categories, products, variants] = await Promise.all([
    executeRanceQuery<RanceCategory>(queryGroups),
    executeRanceQuery<RanceProduct>(queryProducts),
    executeRanceQuery<RanceVariant>(queryVariants),
  ]);

  return { categories, products, variants };
}

export async function runDryRun(): Promise<ImportStats> {
  const { categories, products, variants } = await fetchRanceLabData();
  const supabase = getSupabaseAdmin();

  // 1. Existing Supabase Data
  const { data: existingCats } = await supabase.from("product_categories").select("slug");
  const existingCatSlugs = new Set((existingCats || []).map((c) => c.slug));

  const { data: existingProds } = await supabase.from("products").select("slug");
  const existingProdSlugs = new Set((existingProds || []).map((p) => p.slug));

  const { data: existingVars } = await supabase.from("product_variants").select("sku");
  const existingVarSkus = new Set((existingVars || []).map((v) => v.sku));

  // 2. Categories Stats
  let catToInsert = 0;
  let catToUpdate = 0;
  for (const c of categories) {
    const slug = slugifyCategory(c.ProductGroupName);
    if (existingCatSlugs.has(slug)) {
      catToUpdate++;
    } else {
      catToInsert++;
    }
  }

  // 3. Products Stats
  let prodToInsert = 0;
  let prodToUpdate = 0;
  for (const p of products) {
    const slug = slugifyProduct(p.ProductName, p.ProductID);
    if (existingProdSlugs.has(slug)) {
      prodToUpdate++;
    } else {
      prodToInsert++;
    }
  }

  // 4. Variants Stats
  let varToInsert = 0;
  let varToUpdate = 0;
  let zeroPriceCount = 0;
  const productsWithChildrenSet = new Set<string>();

  for (const v of variants) {
    productsWithChildrenSet.add(v.ProductID);
    const sku = v.ChildID === "0001" ? v.Barcode : `${v.Barcode}-${v.ChildID}`;
    if (existingVarSkus.has(sku)) {
      varToUpdate++;
    } else {
      varToInsert++;
    }
    const price = parseFloat(v.SellingPrice);
    if (isNaN(price) || price === 0) {
      zeroPriceCount++;
    }
  }

  return {
    categories: {
      totalSource: categories.length,
      toInsert: catToInsert,
      toUpdate: catToUpdate,
      skipped: 0,
    },
    products: {
      totalSource: products.length,
      toInsert: prodToInsert,
      toUpdate: prodToUpdate,
      skipped: 0,
    },
    variants: {
      totalSource: variants.length,
      toInsert: varToInsert,
      toUpdate: varToUpdate,
      skipped: 0,
      flaggedZeroPrice: zeroPriceCount,
    },
    summary: {
      productsWithVariants: productsWithChildrenSet.size,
      productsWithoutVariants: products.length - productsWithChildrenSet.size,
      zeroSellablePrices: zeroPriceCount,
      leadingZerosPreserved: true,
    },
  };
}

export async function runCatalogImport() {
  const { categories, products, variants } = await fetchRanceLabData();
  const supabase = getSupabaseAdmin();

  console.log(`Starting real catalog import into Supabase PostgreSQL:`);
  console.log(`- Categories to process: ${categories.length}`);
  console.log(`- Products to process: ${products.length}`);
  console.log(`- Variants to process: ${variants.length}`);

  // -------------------------------------------------------------
  // STEP 1: Categories Upsert
  // -------------------------------------------------------------
  console.log("\n[1/3] Upserting product categories...");
  const categoryRecords = categories.map((c) => {
    const isNone = c.ProductGroupName.trim().toLowerCase() === "[none]";
    const name = isNone ? "General" : c.ProductGroupName.trim();
    const slug = slugifyCategory(c.ProductGroupName);
    const isActive = c.IsActive === "True" || c.IsActive === "1";
    const sortOrder = parseInt(c.ProductGroupID, 10) || 0;

    return {
      name,
      slug,
      description: `RanceLab Group ${c.ProductGroupID}`,
      is_active: isActive,
      sort_order: sortOrder,
    };
  });

  const { error: catErr } = await supabase
    .from("product_categories")
    .upsert(categoryRecords, { onConflict: "slug" });

  if (catErr) {
    throw new Error(`Failed to upsert categories: ${catErr.message}`);
  }

  // Load all categories with IDs for foreign key reference
  const { data: insertedCats, error: fetchCatErr } = await supabase
    .from("product_categories")
    .select("id, slug, sort_order");

  if (fetchCatErr || !insertedCats) {
    throw new Error(`Failed to retrieve inserted categories: ${fetchCatErr?.message}`);
  }

  const categoryIdByGroup = new Map<string, string>();
  for (const c of categories) {
    const slug = slugifyCategory(c.ProductGroupName);
    const match = insertedCats.find((ic) => ic.slug === slug);
    if (match) {
      categoryIdByGroup.set(c.ProductGroupID, match.id);
    }
  }

  // Fallback category if somehow missing
  const defaultCategoryId = insertedCats.find((ic) => ic.slug === "general")?.id || insertedCats[0].id;
  console.log(`Categories upserted successfully: ${insertedCats.length} categories active.`);

  // -------------------------------------------------------------
  // STEP 2: Products Chunked Upsert
  // -------------------------------------------------------------
  console.log("\n[2/3] Upserting products in batches of 500...");
  const CHUNK_SIZE = 500;
  const productRecords = products.map((p) => {
    const categoryId = categoryIdByGroup.get(p.ProductGroupID) || defaultCategoryId;
    const name = p.ProductName.trim() || `Product ${p.ProductID}`;
    const slug = slugifyProduct(name, p.ProductID);
    const isActive = p.IsActive === "True" || p.IsActive === "1";
    const sortOrder = parseInt(p.ProductID, 10) || 0;

    return {
      category_id: categoryId,
      name,
      slug,
      description: null,
      note: null,
      color: "#f4d6bc",
      image_url: "/product-placeholder.svg",
      hover_image_url: null,
      is_active: isActive,
      sort_order: sortOrder,
    };
  });

  for (let i = 0; i < productRecords.length; i += CHUNK_SIZE) {
    const chunk = productRecords.slice(i, i + CHUNK_SIZE);
    const { error: prodErr } = await supabase
      .from("products")
      .upsert(chunk, { onConflict: "slug" });

    if (prodErr) {
      throw new Error(`Failed to upsert product batch ${i} - ${i + chunk.length}: ${prodErr.message}`);
    }
    console.log(`  Processed products ${i + chunk.length} / ${productRecords.length}`);
  }

  // Load product IDs using paginated range queries
  console.log("Retrieving product IDs to map variants...");
  const productIdBySourceId = new Map<string, string>();
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data: dbProds, error: pFetchErr } = await supabase
      .from("products")
      .select("id, slug")
      .range(offset, offset + PAGE_SIZE - 1);

    if (pFetchErr) {
      throw new Error(`Failed to retrieve product IDs at offset ${offset}: ${pFetchErr.message}`);
    }

    if (!dbProds || dbProds.length === 0) {
      break;
    }

    for (const item of dbProds) {
      // Slug is formatted as: [name]-[productId] where productId is the last segment
      const lastHyphenIndex = item.slug.lastIndexOf("-");
      if (lastHyphenIndex !== -1) {
        const sourceId = item.slug.substring(lastHyphenIndex + 1);
        productIdBySourceId.set(sourceId, item.id);
      }
    }

    offset += dbProds.length;
    if (dbProds.length < PAGE_SIZE) {
      break;
    }
  }

  console.log(`Product mapping ready: ${productIdBySourceId.size} products mapped.`);

  // -------------------------------------------------------------
  // STEP 3: Variants Chunked Upsert
  // -------------------------------------------------------------
  console.log("\n[3/3] Upserting variants in batches of 500...");
  const variantRecords: any[] = [];

  for (const v of variants) {
    const parentProductId = productIdBySourceId.get(v.ProductID);
    if (!parentProductId) {
      console.warn(`Skipping variant for unknown parent ProductID: ${v.ProductID}`);
      continue;
    }

    const sku = v.ChildID === "0001" ? v.Barcode : `${v.Barcode}-${v.ChildID}`;
    const variantName = v.ChildID === "0001" ? "Standard" : `Batch ${v.ChildID}`;
    const sellingPrice = parseFloat(v.SellingPrice) || 0.0;
    const mrp = parseFloat(v.MRP) || sellingPrice;
    const sortOrder = parseInt(v.ChildID, 10) || 0;

    variantRecords.push({
      product_id: parentProductId,
      variant_name: variantName,
      sku,
      selling_price: Math.max(0, sellingPrice),
      mrp: Math.max(0, mrp),
      is_active: true,
      sort_order: sortOrder,
      erp_product_id: v.ProductID,
      erp_child_id: v.ChildID,
      erp_location_code: v.LocationCode || "001",
      erp_warehouse_code: "1",
      erp_srate: Math.max(0, sellingPrice),
    });
  }

  for (let i = 0; i < variantRecords.length; i += CHUNK_SIZE) {
    const chunk = variantRecords.slice(i, i + CHUNK_SIZE);
    const { error: varErr } = await supabase
      .from("product_variants")
      .upsert(chunk, { onConflict: "sku" });

    if (varErr) {
      throw new Error(`Failed to upsert variant batch ${i} - ${i + chunk.length}: ${varErr.message}`);
    }
    console.log(`  Processed variants ${i + chunk.length} / ${variantRecords.length}`);
  }

  console.log(`Catalog import complete!`);
}
