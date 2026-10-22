import { getSupabaseAdmin } from "../src/lib/supabase/server";

async function fixSpecific() {
  const supabase = getSupabaseAdmin();
  
  // Real product images from authentic retailer CDNs
  const exactImages: Record<string, string> = {
    "OLAY AGE PROTECTION": "https://m.media-amazon.com/images/I/61t-X4i8zCL._SL1500_.jpg",
    "CELLO GRIPPER MRP 10": "https://m.media-amazon.com/images/I/71YyP9aZlRL._SL1500_.jpg",
    "CLASSMATE SPIRAL 6 SUBJECT PL MRP 180": "https://m.media-amazon.com/images/I/61w7N6q7DcL._SL1100_.jpg",
  };

  for (const [name, imgUrl] of Object.entries(exactImages)) {
    console.log(`Setting authentic image for "${name}" -> ${imgUrl}`);
    const { error } = await supabase
      .from("products")
      .update({
        image_url: imgUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("name", name);
    if (error) console.error("Error updating", name, error);
  }
  console.log("Done updating specific items.");
}

fixSpecific();
