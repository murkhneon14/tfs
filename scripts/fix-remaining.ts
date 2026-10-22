import { getSupabaseAdmin } from "../src/lib/supabase/server";

async function fixThree() {
  const supabase = getSupabaseAdmin();
  const fixes = [
    { name: 'OLAY AGE PROTECTION', q: 'Olay Age Protect anti aging cream' },
    { name: 'CELLO GRIPPER MRP 10', q: 'Cello Gripper ball pen blue' },
    { name: 'CLASSMATE SPIRAL 6 SUBJECT PL MRP 180', q: 'Classmate spiral notebook 6 subject' }
  ];

  for (const item of fixes) {
    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(item.q)}&form=HDRSC2`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    const regex = /murl&quot;:&quot;(https?:\/\/[^&"]+)&quot;/g;
    let match;
    let foundUrl = null;
    while ((match = regex.exec(html)) !== null) {
      const url = match[1];
      if (url.startsWith("http") && (url.includes(".jpg") || url.includes(".png") || url.includes(".webp"))) {
        foundUrl = url;
        break;
      }
    }

    if (foundUrl) {
      console.log(`Fixing "${item.name}" -> ${foundUrl}`);
      const { error } = await supabase
        .from('products')
        .update({ image_url: foundUrl, updated_at: new Date().toISOString() })
        .eq('name', item.name);
      if (error) console.error("Error:", error);
    }
  }
}

fixThree();
