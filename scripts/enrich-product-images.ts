import { getSupabaseAdmin } from "../src/lib/supabase/server";

type ImageCandidate = {
  primary: string;
  title: string;
  source: "Open Food Facts" | "Bing Images";
  score?: number;
};

type ProductVariant = { sku: string | null; selling_price?: number; is_active?: boolean };
type ProductRow = {
  id: string;
  name: string;
  image_url: string | null;
  product_categories?: { name: string; is_active?: boolean } | { name: string; is_active?: boolean }[] | null;
  product_variants?: ProductVariant[] | null;
};

type OpenFoodFactsProduct = {
  product_name?: string;
  image_front_url?: string;
  image_url?: string;
  images?: Record<string, { url?: string }>;
  selected_images?: { front?: { display?: Record<string, string> } };
};

const USER_AGENT = "TheFamilyStore/1.0 (product-image-enrichment)";
const QUERY_PAGE_SIZE = 1000;
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "pack", "packet", "packaging", "type", "product", "image", "photo",
  "buy", "online", "india", "new", "original", "pcs", "pc", "piece", "pieces", "size", "mrp", "rs", "inr",
]);

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanSearchTerm(name: string): string {
  return decodeEntities(name)
    .replace(/\bMRP\s*[-:]?\s*\d+(?:\.\d+)?\b/gi, " ")
    .replace(/\b(?:RS|INR)\s*[-:]?\s*\d+(?:\.\d+)?\b/gi, " ")
    .replace(/\b\d{8,14}\b/g, " ")
    .replace(/[^a-zA-Z0-9\s.+&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchTokens(value: string): Set<string> {
  const cleaned = decodeEntities(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b\d+(?:\.\d+)?\s*(?:mg|kg|g|ml|ltr|litre|liter|l|pcs?|pieces?|count|rolls?)\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ");

  return new Set(cleaned.split(/\s+/).filter((token) => token.length > 1 && !STOP_WORDS.has(token)));
}

function overlapScore(productName: string, candidateText: string): number {
  const expected = searchTokens(productName);
  const found = searchTokens(candidateText);
  if (!expected.size) return 0;
  const matches = [...expected].filter((token) => found.has(token)).length;
  if (matches < Math.min(2, expected.size)) return 0;
  return matches / expected.size;
}

function hasConflictingPackSize(productName: string, resultTitle: string): boolean {
  const getSizes = (value: string) => {
    const normalized = decodeEntities(value).toLowerCase().replace(/\s+/g, "");
    return [...normalized.matchAll(/\d+(?:\.\d+)?(?:mg|kg|g|ml|ltr|litre|liter|l)\b/g)].map((match) => match[0]);
  };

  const expected = getSizes(productName);
  const found = getSizes(resultTitle);
  return expected.length > 0 && found.length > 0 && !expected.some((size) => found.includes(size));
}

function getOpenFoodFactsImage(product: OpenFoodFactsProduct): string | null {
  const frontDisplay = product.selected_images?.front?.display;
  const candidates = [
    product.image_front_url,
    product.images?.front?.url,
    frontDisplay?.en,
    frontDisplay ? Object.values(frontDisplay)[0] : undefined,
    product.image_url,
  ];
  return candidates.find((value): value is string => Boolean(value && /^https:\/\//i.test(value))) || null;
}

async function lookupOpenFoodFacts(barcode: string): Promise<{ candidate: ImageCandidate | null; productName?: string }> {
  if (!/^\d{8,14}$/.test(barcode)) return { candidate: null };

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { candidate: null };

    const data = await res.json() as { status?: number; product?: OpenFoodFactsProduct };
    if (data.status !== 1 || !data.product) return { candidate: null };

    const productName = data.product.product_name?.trim();
    const primary = getOpenFoodFactsImage(data.product);
    return {
      productName,
      candidate: primary ? { primary, title: productName || barcode, source: "Open Food Facts" } : null,
    };
  } catch {
    return { candidate: null };
  }
}

function extractBingCandidates(html: string, productNames: string[], debug = false): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const seen = new Set<string>();
  const imagePattern = /murl(?:&quot;|")\s*:\s*(?:&quot;|")(https?:[^&"]+)(?:&quot;|")/g;
  let match: RegExpExecArray | null;

  while ((match = imagePattern.exec(html)) !== null) {
    const imageStart = match.index;
    const objectStart = html.lastIndexOf("{", imageStart);
    const objectEnd = html.indexOf("}", imageStart);
    const objectText = objectStart >= 0 && objectEnd > imageStart
      ? html.slice(objectStart, objectEnd + 1)
      : html.slice(Math.max(0, imageStart - 1800), Math.min(html.length, imageStart + 300));
    const titleMatch = objectText.match(/t(?:&quot;|")\s*:\s*(?:&quot;|")([^&"]+)/);
    const title = decodeEntities(titleMatch?.[1] || "").trim();
    const primary = decodeEntities(match[1].replace(/\\\//g, "/")).trim();
    const lowerUrl = primary.toLowerCase();

    if (!primary.startsWith("https://") || seen.has(primary)) continue;
    if (/logo|favicon|avatar|wallpaper|clip.?art|stock-photo|bing\.com\/th\//i.test(lowerUrl)) continue;

    const score = Math.max(...productNames.map((productName) => overlapScore(productName, `${title} ${primary}`)));
    const conflictingSize = productNames.every((productName) => hasConflictingPackSize(productName, title));
    if (debug && candidates.length < 5) console.log(`[Bing result] score=${score.toFixed(2)} sizeConflict=${conflictingSize} title="${title}" url=${primary}`);
    if (score < 0.45 || conflictingSize) continue;
    seen.add(primary);
    candidates.push({ primary, title, source: "Bing Images", score });
  }

  return candidates.sort((left, right) => (right.score || 0) - (left.score || 0)).slice(0, 12);
}

async function lookupBingImages(productNames: string[], debug = false): Promise<ImageCandidate[]> {
  const searchTerm = [...new Set(productNames.map(cleanSearchTerm).filter(Boolean))].join(" ");
  if (!searchTerm) return [];

  try {
    const query = `${searchTerm} product packaging India`;
    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];
    return extractBingCandidates(await res.text(), productNames, debug);
  } catch {
    return [];
  }
}

async function verifyImage(url: string, debug = false): Promise<boolean> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
  };

  try {
    const head = await fetch(url, { method: "HEAD", headers, signal: AbortSignal.timeout(5000) });
    const headType = head.headers.get("content-type")?.toLowerCase() || "";
    if (head.ok && headType.startsWith("image/") && !headType.includes("svg")) return true;
    if (debug) console.log(`[verify] HEAD status=${head.status}, type=${headType || "missing"}`);

    const response = await fetch(url, {
      method: "GET",
      headers: { ...headers, Range: "bytes=0-0" },
      signal: AbortSignal.timeout(5000),
    });
    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    const valid = response.ok && contentType.startsWith("image/") && !contentType.includes("svg");
    if (debug) console.log(`[verify] GET status=${response.status}, type=${contentType || "missing"}`);
    await response.body?.cancel();
    return valid;
  } catch {
    return false;
  }
}

function getPrimaryBarcode(product: ProductRow): string | null {
  const variants = Array.isArray(product.product_variants) ? product.product_variants : [];
  return variants.find((variant) => /^\d{8,14}$/.test(variant.sku || ""))?.sku || null;
}

async function fetchProductsNeedingImages(limit: number, scope: "storefront" | "active" | "all"): Promise<ProductRow[]> {
  const supabase = getSupabaseAdmin();
  const products = new Map<string, ProductRow>();
  let offset = 0;
  const storefront = scope === "storefront";

  while (products.size < limit) {
    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        image_url,
        product_categories${storefront ? "!inner" : ""}(name${storefront ? ", is_active" : ""}),
        product_variants${storefront ? "!inner" : ""}(sku${storefront ? ", selling_price, is_active" : ""})
      `)
      .or("image_url.eq./product-placeholder.svg,image_url.is.null")
      .order("id", { ascending: true })
      .range(offset, offset + QUERY_PAGE_SIZE - 1);

    if (storefront) {
      query = query
        .eq("is_active", true)
        .eq("product_categories.is_active", true)
        .eq("product_variants.is_active", true)
        .gt("product_variants.selling_price", 0);
    } else if (scope === "active") {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to query products: ${error.message}`);
    const rows = (data || []) as ProductRow[];
    for (const product of rows) {
      if (!products.has(product.id)) products.set(product.id, product);
      if (products.size >= limit) break;
    }

    if (rows.length < QUERY_PAGE_SIZE) break;
    offset += QUERY_PAGE_SIZE;
  }

  return [...products.values()];
}

async function main() {
  const args = process.argv.slice(2);
  const limitValue = args.find((arg, index) => args[index - 1] === "--limit" || arg.startsWith("--limit="));
  const parsedLimit = limitValue
    ? Number.parseInt(limitValue.includes("=") ? limitValue.split("=")[1] : limitValue, 10)
    : 100;
  const limit = args.includes("--all") ? Number.MAX_SAFE_INTEGER : Math.max(1, parsedLimit || 100);
  const concurrencyValue = args.find((arg, index) => args[index - 1] === "--concurrency" || arg.startsWith("--concurrency="));
  const parsedConcurrency = concurrencyValue
    ? Number.parseInt(concurrencyValue.includes("=") ? concurrencyValue.split("=")[1] : concurrencyValue, 10)
    : 4;
  const concurrency = Math.max(1, Math.min(8, parsedConcurrency || 4));
  const dryRun = args.includes("--dry-run");
  const debug = args.includes("--debug");
  const scope = args.includes("--whole-catalog")
    ? "all"
    : args.includes("--active-products")
      ? "active"
      : "storefront";
  const supabase = getSupabaseAdmin();

  console.log("=================================================");
  console.log("       PRODUCT IMAGE ENRICHMENT PIPELINE         ");
  console.log("=================================================");
  console.log(`Image source: barcode lookup first, ranked web image search second.`);
  console.log(`Scope: ${scope === "all" ? "all products" : scope === "active" ? "all active products" : "active storefront products"}.`);
  console.log(`Mode: ${dryRun ? "review only" : "update catalog"} | concurrency: ${concurrency}`);

  const queue = await fetchProductsNeedingImages(limit, scope);
  const scopeLabel = scope === "all" ? "products" : scope === "active" ? "active products" : "active storefront products";
  console.log(`Found ${queue.length} ${scopeLabel} requiring images.\n`);

  let updatedCount = 0;
  let openFoodFactsCount = 0;
  let bingCount = 0;
  let failedCount = 0;
  let cursor = 0;
  const supabaseAdmin = supabase;

  async function enrichOne(index: number, product: ProductRow) {
    const barcode = getPrimaryBarcode(product);
    let barcodeProductName: string | undefined;
    let candidate: ImageCandidate | null = null;

    if (barcode) {
      const result = await lookupOpenFoodFacts(barcode);
      barcodeProductName = result.productName;
      if (result.candidate && await verifyImage(result.candidate.primary, debug && index < 3)) candidate = result.candidate;
    }

    if (!candidate) {
      const references = [product.name];
      if (barcodeProductName && overlapScore(product.name, barcodeProductName) >= 0.34) references.push(barcodeProductName);
      if (debug && index < 3) console.log(`[DEBUG] Searching "${references.join(" | ")}"`);
      const candidates = await lookupBingImages(references, debug && index < 3);
      for (const option of candidates) {
        if (hasConflictingPackSize(product.name, option.title)) continue;
        if (debug && index < 3) console.log(`[DEBUG] Verifying score=${option.score?.toFixed(2)} ${option.primary}`);
        if (await verifyImage(option.primary, debug && index < 3)) {
          candidate = option;
          break;
        }
      }
    }

    if (!candidate) {
      failedCount++;
      return;
    }

    if (!dryRun) {
      const updates: { image_url: string; hover_image_url?: string; updated_at: string } = {
        image_url: candidate.primary,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseAdmin.from("products").update(updates).eq("id", product.id);
      if (error) {
        failedCount++;
        console.error(`[DB ERROR] ${product.name}: ${error.message}`);
        return;
      }
    }

    updatedCount++;
    if (candidate.source === "Open Food Facts") openFoodFactsCount++;
    else bingCount++;

    if (dryRun && index < 20) {
      console.log(`[PREVIEW] ${product.name} -> ${candidate.source} (${candidate.score?.toFixed(2) ?? "barcode"}) ${candidate.title.slice(0, 110)}`);
      console.log(`          ${candidate.primary}`);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (cursor < queue.length) {
      const index = cursor++;
      await enrichOne(index, queue[index]);
      const completed = index + 1;
      if (completed % 25 === 0 || completed === queue.length) {
        console.log(`[${completed}/${queue.length}] matched ${updatedCount}, barcode ${openFoodFactsCount}, web ${bingCount}, unresolved ${failedCount}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  });

  await Promise.all(workers);

  console.log("\n=================================================");
  console.log("ENRICHMENT SUMMARY:");
  console.log(`  Catalog updated:      ${dryRun ? 0 : updatedCount}`);
  console.log(`  Exact barcode photos: ${openFoodFactsCount}`);
  console.log(`  Ranked web photos:    ${bingCount}`);
  console.log(`  Unresolved products:  ${failedCount}`);
  console.log("=================================================\n");
}

main().catch((error) => {
  console.error("Image enrichment failed:", error);
  process.exit(1);
});
