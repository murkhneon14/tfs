import { getSupabaseAdmin } from "../src/lib/supabase/server";

interface CleanMapping {
  query: string;
  fallbackImage?: string;
}

const CUSTOM_CLEAN: Record<string, CleanMapping> = {
  "CDM 5STAR 20.2G": { query: "Cadbury 5 Star chocolate 20g" },
  "KOPIKO CANDYY 3.7G": { query: "Kopiko coffee candy" },
  "AMTAR": { query: "Aam papad dried mango slices Indian sweet" },
  "Prorect&amp;Care 150Ml": { query: "Nivea Protect and Care deodorant spray 150ml" },
  "taokaenoi jellly": { query: "Tao Kae Noi crispy seaweed jelly snack" },
  "GOODNIGHT REFILL 45ML": { query: "Good Knight mosquito repellent liquid refill 45ml" },
  "HIT COCKROAACHES 200ML": { query: "Godrej Lal Hit cockroach spray 200ml" },
  "Vanish Oxiaction 180Ml": { query: "Vanish Oxi Action stain remover liquid 180ml" },
  "GILLETTEE VECTOR +": { query: "Gillette Vector Plus razor" },
  "BUDWISER 0.0 PEACH*": { query: "Budweiser 0.0 non alcoholic peach drink can" },
  "Carbopnara Buldak": { query: "Samyang Buldak Carbonara hot chicken ramen" },
  "Colgate 5+ Extrasoft": { query: "Colgate kids 5+ extra soft toothbrush" },
  "OURA SUNSET LOUNGE FRESHNESS 10G": { query: "Odonil Oura sunset lounge air freshener" },
  "ORAL B 4NOS": { query: "Oral B shiny clean toothbrush 4 pack" },
  "Doubble Chocolate 105ML": { query: "Kwality Walls Double Chocolate cone ice cream" },
  "MELLOSA LEMON": { query: "Mellosa lemon drink bottle" },
  "NESCAFEE CLASSIC 3.2G": { query: "Nescafe Classic coffee sachet" },
  "Pringles Original40g": { query: "Pringles original potato chips 40g can" },
  "TREATJIMJAM POPS 42G": { query: "Britannia Treat Jim Jam pops biscuits" },
  "Wai Wai Mimi30g": { query: "Wai Wai Mimi ready to eat noodles 30g" },
  "patene miracle rescue bioten strenght condinr200ml": { query: "Pantene Miracle Rescue biotin strength conditioner 200ml" },
  "CENTRUM KID RECHARGE WITH 13 VITAMINS &amp; MINERAL": { query: "Centrum Kids Multivitamin chewable tablets" },
  "MARSHMELLO LOLIPOP": { query: "Marshmallow swirl lollipop candy" },
  "MEFRA COCOA FLAVOURED SANDWICH BISKUT": { query: "Cocoa sandwich biscuit with cream" },
  "2 PMCHICKEN FLAVOUR CRACKER": { query: "2PM Chicken flavour crackers snack" },
  "KELLOGGS MUESLI FRIIT NUT &amp; SEEDS 12 IN 1 POWER BR": { query: "Kellogg's Muesli 12 in 1 fruit nut seeds" },
  "CARRAGEENAN MADE FROM SEAWDEED YOUNG COCUNUT FLAVO": { query: "Coconut jelly seaweed snack dessert" },
  "NORIKO ROASTED TOFU BLOCK  SNACK THICK CUT RICE": { query: "Roasted tofu rice snack crispy" },
  "ALPENLIEBE GRAND DCLAIRS": { query: "Alpenliebe Grand Eclairs caramel toffee" },
  "NEVEA CREAM 25ML": { query: "Nivea Creme blue tin 25ml" },
  "WHILD ROSE": { query: "Wild rose incense sticks agarbatti aroma" },
  "KSHEER RASGULLA 500G": { query: "Ksheer Rasgulla tin 500g" },
  "CHARU LILLY": { query: "Lily incense sticks agarbatti aroma" },
  "FONTYS MUSTARD": { query: "Kasundi yellow mustard sauce bottle" },
  "SHPPHIRE SDELUXE TOFFEES 550G": { query: "Sapphire Deluxe toffees tin box" },
  "SAPPHIR MINTY CANDIES 600G": { query: "Sapphire Minty candies tin box" },
  "MU FRUIT ECLAIRS MILKY TWIST 100G": { query: "Fruit eclairs milky twist candies" },
  "COLOGATE BRUSH 2+": { query: "Colgate kids extra soft toothbrush 2+" },
  "SAFTY PIN": { query: "Steel safety pins pack bunch" },
  "XUDE ENERGIZE WITH INGREDIENTS THAT MATTER": { query: "Xude energy drink can" },
  "1 AM SWADIST SEWAIYAN": { query: "Roasted vermicelli sewaiyan 1kg packet" },
  "DIWAKAR MASALA": { query: "Indian garam masala packet spice" },
  "CHRISMAS SENTED CANDLE": { query: "Scented jar candle holiday decorative" },
  "AMTIR CHIKEN PICKLE": { query: "Spicy chicken pickle jar non veg" },
  "vellam water 500 ml": { query: "Vellam mineral water bottle 500ml" },
  "leechant nick mick chia seeds 100g": { query: "Raw organic chia seeds 100g packet" },
  "CLASS MATE EXCERCISE BOOK 140 PAGE FOUR LINE": { query: "Classmate four line notebook 140 pages" },
  "MAXO FLACKER": { query: "Maxo mosquito repellent liquid refill" },
  "SUPRE Lighter": { query: "Kitchen gas lighter stainless steel" },
  "GRAVITY Aone platinum spoon &amp; forks": { query: "Stainless steel spoons and forks set cutlery" },
  "Deewakar Beson 200gm": { query: "Gram flour besan 200g grocery packet" },
  "EGGS SINGLE PC": { query: "Farm fresh brown eggs single" },
  "Deewakars Sugar 1kg": { query: "Refined sugar crystal 1kg grocery packet" },
  "Deewakars Maida 1kg": { query: "Refined wheat flour maida 1kg grocery packet" },
  "INDIEMINT SINGLE PIECE": { query: "Gold Flake Indie Mint single cigarette box" },
  "B.B.Q Jelly sticck": { query: "Fruit jelly sticks snack sweet candy" },
  "KIDZY CHOCOS CHIPS": { query: "Choco chips cookies confectionery snack" },
  "DELIFUN IRIS CREAM BUNT CAKE 47G": { query: "Bundt cake cream filled sponge cake 47g" },
  "VEVEY CREAM HORN CRUNCHY AND CREAMY35GM": { query: "Cream horn crunchy pastry cream filled" },
  "GAIASPORT ALMONG N RAISIN": { query: "Gaia sport almond and raisin energy bar" },
  "light 3speed": { query: "Rechargeable LED desk lamp portable 3 speed" },
  "DEEWAKER ALMOND 20RS": { query: "California almonds badam 50g small packet" },
  "DEEWAKER KISHMISH 20RS": { query: "Golden raisins kishmish small packet dry fruits" },
  "LONSTAR BALL 15G": { query: "Chewy fruit ball candy sweet snack" },
  "MAYBELLINENEWYORK MATTEINK": { query: "Maybelline Superstay Matte Ink liquid lipstick" },
  "restick notes  paper flage 50rs": { query: "Sticky notes pastel memo flags pad" },
  "RAMEN FULL PACKET": { query: "Korean instant ramen noodles packet" },
  "toy canddy": { query: "Kids toy with candy surprise" },
  "saathi copy": { query: "ITC Saathi single line copy notebook" },
  "cremfilo choco creme filled croissant": { query: "Cremfilo chocolate cream filled croissant Bauli" },
  "roastique drink 230ml": { query: "Roastique coffee drink bottle 230ml" },
  "deconstruct vit c brightning moist 50gm": { query: "Deconstruct Vitamin C brightening moisturizer 50g" },
  "regullar eno": { query: "Eno regular fruit salt antacid sachet 5g" },
  "yamtar 10rs": { query: "Spicy savoury namkeen mixture snack packet" },
  "deewakar ajinamoto 13gm": { query: "Ajinomoto monosodium glutamate seasoning sachet" },
  "you va mini note book": { query: "Youva Navneet small pocket notebook" },
  "deewakars elachi 10rs": { query: "Green cardamom elaichi small pouch spice" },
  "jam ojam": { query: "Mixed fruit jam jar sweet spread" },
};

// 1. Try Open Food Facts by Barcode
async function lookupOpenFoodFacts(barcode: string): Promise<string | null> {
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
      if (primary && primary.startsWith("http")) return primary;
    }
  } catch {
    // ignore
  }
  return null;
}

// 2. Try Bing Image Search
async function lookupBing(query: string): Promise<string | null> {
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
    const regex = /murl&quot;:&quot;(https?:\/\/[^&"]+)&quot;/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const url = match[1];
      if (
        url.startsWith("http") &&
        !url.includes("wikimedia.org") &&
        !url.includes("logo") &&
        (url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".png") || url.endsWith(".webp") || url.includes("images") || url.includes("product") || url.includes("media") || url.includes("upload"))
      ) {
        return url;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

// 3. Verify image URL
async function verifyImage(url: string): Promise<boolean> {
  if (url.includes("openfoodfacts.org")) return true;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) return true;
    const getRes = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Range": "bytes=0-100",
      },
      signal: AbortSignal.timeout(3500),
    });
    return getRes.ok || getRes.status === 206;
  } catch {
    return false;
  }
}

async function runEnrichment() {
  const supabase = getSupabaseAdmin();

  console.log("=================================================");
  console.log("   TARGETED ENRICHMENT: FINAL 78 STOREFRONT ITEMS");
  console.log("=================================================\n");

  const { data: rawProducts, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      image_url,
      product_categories!inner(name),
      product_variants!inner(sku, selling_price)
    `)
    .eq("is_active", true)
    .gt("product_variants.selling_price", 0)
    .or("image_url.eq./product-placeholder.svg,image_url.is.null");

  if (error || !rawProducts) {
    console.error("Failed to query missing products:", error);
    process.exit(1);
  }

  // Deduplicate by product id
  const map = new Map<string, typeof rawProducts[0]>();
  for (const p of rawProducts) {
    if (!map.has(p.id)) map.set(p.id, p);
  }
  const products = Array.from(map.values());

  console.log(`Processing exactly ${products.length} remaining products...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const category = (p.product_categories as any)?.name;
    const variants = (p.product_variants as any[]) || [];
    const sku = variants.find((v) => /^\d{8,14}$/.test(v.sku || ""))?.sku;

    const custom = CUSTOM_CLEAN[p.name];
    const searchTerm = custom?.query || `${p.name} ${category || "grocery"}`;

    console.log(`[${i + 1}/${products.length}] "${p.name}" -> Search: "${searchTerm}" (SKU: ${sku || "None"})`);

    let imageUrl: string | null = null;

    // Step 1: Open Food Facts if valid SKU
    if (sku) {
      imageUrl = await lookupOpenFoodFacts(sku);
      if (imageUrl) {
        console.log(`  -> OFF Hit: ${imageUrl.slice(0, 65)}...`);
      }
    }

    // Step 2: Bing search with cleaned search term
    if (!imageUrl) {
      imageUrl = await lookupBing(searchTerm);
    }

    if (imageUrl) {
      const isValid = await verifyImage(imageUrl);
      if (isValid) {
        const { error: updateErr } = await supabase
          .from("products")
          .update({
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);

        if (!updateErr) {
          console.log(`  [UPDATED] -> ${imageUrl.slice(0, 70)}...`);
          successCount++;
        } else {
          console.error(`  [DB ERR] ->`, updateErr.message);
          failCount++;
        }
      } else {
        // Fallback: try search with basic product name
        const fallbackUrl = await lookupBing(`${p.name.replace(/[^a-zA-Z0-9\s]/g, " ")} product photo`);
        if (fallbackUrl && (await verifyImage(fallbackUrl))) {
          await supabase.from("products").update({ image_url: fallbackUrl, updated_at: new Date().toISOString() }).eq("id", p.id);
          console.log(`  [UPDATED fallback] -> ${fallbackUrl.slice(0, 70)}...`);
          successCount++;
        } else {
          console.log(`  [REJECTED URL] -> ${imageUrl.slice(0, 60)}...`);
          failCount++;
        }
      }
    } else {
      console.log(`  [NO IMAGE FOUND]`);
      failCount++;
    }

    // Polite 200ms delay between items
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n=================================================");
  console.log("FINAL SUMMARY:");
  console.log(`  Updated: ${successCount} / ${products.length}`);
  console.log(`  Failed:  ${failCount}`);
  console.log("=================================================\n");
}

runEnrichment();
