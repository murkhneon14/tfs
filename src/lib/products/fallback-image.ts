type CatalogProductImage = {
  id?: string;
  name: string;
  category: string;
  color?: string;
  image?: string | null;
};

type PackageStyle = "bottle" | "book" | "electronics" | "food" | "paper" | "pet" | "snack" | "stationery";

const STYLE_RULES: Array<[PackageStyle, RegExp]> = [
  ["stationery", /\b(pen|pencil|marker|notebook|register|sketch|eraser|sharpener|stationery|classmate|pentonic)\b/i],
  ["paper", /\b(tissue|tissues|toilet roll|paper towel|napkin|paper cup|paper straw)\b/i],
  ["electronics", /\b(fan|lamp|bulb|charger|battery|earphone|headphone|cable|electronic)\b/i],
  ["pet", /\b(cat|kitten|dog|puppy|pet|whiskas|meow)\b/i],
  ["bottle", /\b(juice|water|soda|cola|drink|milk|shampoo|lotion|cream|wash|roll.on|deodorant|spray|cleaner|detergent|oil|sauce|syrup|liquid|sprite|maaza|nivea|garnier|pond.s|fa men)\b/i],
  ["snack", /\b(chip|chips|biscuit|cookie|cracker|chocolate|wafer|candy|sweet|namkeen|noodle|noodles|popcorn|snack|pringles|5 star|5star|bournville|orbit)\b/i],
  ["food", /\b(rice|flour|atta|salt|sugar|spice|masala|pasta|dal|lentil|cereal|oat|beans|grocery|food|frozen|fries|mccain)\b/i],
];

const ACCENTS = ["#ad3428", "#47736d", "#bd7b3c", "#495d8a", "#7e5b80", "#7b7439"];
const INK = "#292522";

function decodeCatalogText(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getStyle(name: string, category: string): PackageStyle {
  const text = `${name} ${category}`;
  return STYLE_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? "food";
}

function wrapLabel(label: string): string[] {
  const words = label.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 20 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= 3) return lines;
  return [lines[0], lines[1], `${lines[2].slice(0, 17)}…`];
}

function packageIllustration(style: PackageStyle, accent: string): string {
  if (style === "bottle") {
    return `<path d="M347 254v-43h106v43l41 48v174c0 32-26 58-58 58h-72c-32 0-58-26-58-58V302l41-48Z" fill="#f7f2eb" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><path d="M347 211h106v44H347z" fill="${accent}" stroke="${INK}" stroke-width="10"/><path d="M306 346h188v113c0 23-18 41-41 41h-106c-23 0-41-18-41-41V346Z" fill="${accent}"/><path d="M341 383h118M341 413h82" stroke="#fffaf3" stroke-width="12" stroke-linecap="round"/>`;
  }

  if (style === "stationery") {
    return `<rect x="293" y="225" width="214" height="285" rx="18" fill="#f7f2eb" stroke="${INK}" stroke-width="12"/><path d="M293 272h214v70H293z" fill="${accent}"/><path d="M339 385h122M339 422h122M339 459h94" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="m374 254 52-46 31 31-52 46-45 15 14-46Z" fill="${accent}" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>`;
  }

  if (style === "paper") {
    return `<rect x="274" y="285" width="252" height="205" rx="30" fill="#f7f2eb" stroke="${INK}" stroke-width="12"/><path d="M310 350c0-35 28-63 63-63h54c48 0 87 39 87 87v24H310v-48Z" fill="${accent}"/><path d="M340 418h120M340 450h83" stroke="#fffaf3" stroke-width="12" stroke-linecap="round"/><path d="M400 285c-5-35 14-62 35-82 23 32 20 59 5 82" fill="#fffaf3" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>`;
  }

  if (style === "electronics") {
    return `<rect x="275" y="220" width="250" height="300" rx="22" fill="#f7f2eb" stroke="${INK}" stroke-width="12"/><path d="M275 276h250v76H275z" fill="${accent}"/><circle cx="400" cy="420" r="55" fill="#fffaf3" stroke="${INK}" stroke-width="10"/><path d="m400 379 10 28 28-10-20 23 20 23-28-10-10 29-10-29-28 10 20-23-20-23 28 10 10-28Z" fill="${accent}"/>`;
  }

  if (style === "pet") {
    return `<path d="M322 246h156l27 44v212H295V290l27-44Z" fill="#f7f2eb" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><path d="M322 246h156l27 44H295l27-44Z" fill="${accent}" stroke="${INK}" stroke-width="10"/><ellipse cx="400" cy="400" rx="42" ry="34" fill="${accent}"/><circle cx="354" cy="357" r="17" fill="${accent}"/><circle cx="386" cy="342" r="17" fill="${accent}"/><circle cx="419" cy="342" r="17" fill="${accent}"/><circle cx="448" cy="360" r="17" fill="${accent}"/>`;
  }

  if (style === "snack") {
    return `<path d="m313 217 174 0 32 42-18 252H299l-18-252 32-42Z" fill="#f7f2eb" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><path d="M281 259h238l-10 62H291l-10-62Z" fill="${accent}"/><circle cx="400" cy="404" r="66" fill="${accent}"/><path d="m400 355 13 31 34 2-26 21 9 33-30-18-29 18 9-33-26-21 34-2 12-31Z" fill="#fffaf3"/>`;
  }

  return `<path d="m310 238 90-45 90 45v53H310v-53Z" fill="${accent}" stroke="${INK}" stroke-width="11" stroke-linejoin="round"/><path d="M310 291h180v218H310z" fill="#f7f2eb" stroke="${INK}" stroke-width="11"/><path d="M342 365h116M342 401h116M342 437h82" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>`;
}

export function createFallbackProductImage(product: CatalogProductImage): string {
  const name = decodeCatalogText(product.name).trim() || "Everyday essential";
  const category = decodeCatalogText(product.category).trim() || "Everyday finds";
  const labelLines = wrapLabel(name).map((line, index) =>
    `<text x="400" y="${598 + index * 32}" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="1.2" fill="${INK}">${escapeXml(line)}</text>`
  ).join("");
  const safeColor = /^#[0-9a-f]{6}$/i.test(product.color || "") ? product.color! : "#e9dfd5";
  const accent = ACCENTS[(hash(`${product.id || ""}:${name}`) % ACCENTS.length)];
  const style = getStyle(name, category);
  const categoryLabel = escapeXml(category.toUpperCase().slice(0, 26));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 900">
    <rect width="800" height="900" rx="28" fill="${safeColor}"/>
    <circle cx="116" cy="130" r="78" fill="#ffffff" fill-opacity=".28"/>
    <circle cx="696" cy="738" r="120" fill="#ffffff" fill-opacity=".2"/>
    <rect x="151" y="132" width="498" height="592" rx="32" fill="#fffaf3" stroke="${INK}" stroke-opacity=".13" stroke-width="3"/>
    <text x="400" y="184" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="4" fill="${INK}" fill-opacity=".72">THE FAMILY STORE</text>
    <path d="M208 204h384" stroke="${INK}" stroke-opacity=".13" stroke-width="2"/>
    ${packageIllustration(style, accent)}
    ${labelLines}
    <rect x="255" y="652" width="290" height="36" rx="18" fill="${accent}" fill-opacity=".12"/>
    <text x="400" y="676" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="${INK}" fill-opacity=".7">${categoryLabel}</text>
    <text x="400" y="798" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" letter-spacing="3" fill="${INK}" fill-opacity=".58">PRODUCT ILLUSTRATION</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getCatalogImageSource(product: CatalogProductImage): string {
  const image = product.image?.trim();
  if (!image || image === "/product-placeholder.svg" || image.includes("/product-placeholder.svg?")) {
    return createFallbackProductImage(product);
  }
  return image;
}

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index++) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(result);
}
