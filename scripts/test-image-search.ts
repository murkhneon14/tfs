import { getSupabaseAdmin } from "../src/lib/supabase/server";

interface ImageCandidate {
  primary: string;
  hover?: string;
  source: string;
}

// Clean product search terms for better image hits
function cleanSearchTerm(name: string, category?: string): string {
  let cleaned = name
    .replace(/\bMRP\s*[-:]?\s*\d+\b/gi, "")
    .replace(/\bRS\s*[-:]?\s*\d+\b/gi, "")
    .replace(/[^a-zA-Z0-9\s.+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If name doesn't specify what it is, append category
  if (category && !cleaned.toLowerCase().includes(category.toLowerCase())) {
    if (category.toLowerCase() !== "general") {
      cleaned += ` ${category}`;
    }
  }
  return cleaned;
}

// 1. Try Open Food Facts by Barcode
async function lookupOpenFoodFacts(barcode: string): Promise<ImageCandidate | null> {
  if (!barcode || !/^\d{8,14}$/.test(barcode)) return null;

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: { "User-Agent": "TFSGroceryApp/1.0 (contact@thefamilystore.in)" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data.status === 1 && data.product) {
      const p = data.product;
      const primary = p.image_front_url || p.image_url;
      const hover = p.image_ingredients_url || p.image_nutrition_url || p.selected_images?.front?.display?.en;
      if (primary && primary.startsWith("http")) {
        return {
          primary,
          hover: hover && hover !== primary ? hover : undefined,
          source: "OpenFoodFacts",
        };
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

// 2. Try Bing Image Search
async function lookupBingImages(query: string): Promise<ImageCandidate | null> {
  try {
    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract image URLs from murl regex
    const matches: string[] = [];
    const regex = /murl&quot;:&quot;(https?:\/\/[^&"]+)&quot;/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const url = match[1];
      // Filter out low quality, tracker, or broken URLs
      if (
        url.startsWith("http") &&
        !url.includes("wikimedia.org/wikipedia/commons/thumb") &&
        !url.includes("logo") &&
        (url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".png") || url.endsWith(".webp") || url.includes("images") || url.includes("product"))
      ) {
        matches.push(url);
      }
      if (matches.length >= 2) break;
    }

    if (matches.length > 0) {
      return {
        primary: matches[0],
        hover: matches[1] || undefined,
        source: "Bing",
      };
    }
  } catch (err) {
    // ignore
  }
  return null;
}

// 3. Verify image is accessible
async function verifyImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return true;
    // Some CDNs reject HEAD, test with range GET
    const getRes = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Range": "bytes=0-100",
      },
      signal: AbortSignal.timeout(3000),
    });
    return getRes.ok || getRes.status === 206;
  } catch {
    return false;
  }
}

async function testSample() {
  const supabase = getSupabaseAdmin();
  const { data: products } = await supabase
    .from("products")
    .select(`
      id,
      name,
      image_url,
      product_categories(name),
      product_variants(sku, selling_price)
    `)
    .eq("is_active", true)
    .gt("product_variants.selling_price", 0)
    .limit(10);

  console.log(`Testing image search for ${products?.length} products...\n`);

  for (const p of products || []) {
    const category = (p.product_categories as any)?.name;
    const variants = (p.product_variants as any[]) || [];
    const primarySku = variants.find((v) => /^\d{8,14}$/.test(v.sku || ""))?.sku;

    console.log(`Product: "${p.name}" | Category: ${category} | SKU: ${primarySku || "None"}`);

    let img: ImageCandidate | null = null;
    if (primarySku) {
      img = await lookupOpenFoodFacts(primarySku);
    }

    if (!img) {
      const q = cleanSearchTerm(p.name, category);
      img = await lookupBingImages(q);
    }

    if (img) {
      const isValid = await verifyImage(img.primary);
      console.log(`  -> Found via ${img.source} (${isValid ? "VERIFIED" : "UNVERIFIED"}): ${img.primary}`);
      if (img.hover) {
        console.log(`     Hover: ${img.hover}`);
      }
    } else {
      console.log("  -> No image found");
    }
    console.log("");
  }
}

testSample();
