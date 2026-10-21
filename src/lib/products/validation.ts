const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normalizes text into a clean URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Validates a slug string against URL safety constraints.
 */
export function isValidSlug(slug: string, maxLength: number = 280): boolean {
  if (typeof slug !== "string" || !slug.trim()) return false;
  const clean = slug.trim();
  return clean.length >= 2 && clean.length <= maxLength && SLUG_REGEX.test(clean);
}

/**
 * Validates standard UUID format.
 */
export function isValidUUID(id: string): boolean {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

/**
 * Parses and validates currency values strictly suitable for PostgreSQL NUMERIC(10, 2).
 * Guards against floating-point inaccuracies and negative amounts.
 */
export function parseCurrency(value: unknown): { valid: boolean; value?: number; error?: string } {
  if (value === undefined || value === null) {
    return { valid: false, error: "Price value is required." };
  }

  let num: number;
  if (typeof value === "number") {
    num = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      return { valid: false, error: "Price must be a valid non-negative decimal with up to 2 decimal places (e.g. 19.99)." };
    }
    num = Number(trimmed);
  } else {
    return { valid: false, error: "Price must be a number or numeric string." };
  }

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return { valid: false, error: "Price must be a finite number." };
  }

  if (num < 0) {
    return { valid: false, error: "Price cannot be negative." };
  }

  if (num > 99999999.99) {
    return { valid: false, error: "Price exceeds maximum supported amount." };
  }

  // Round precisely to 2 decimal places
  const rounded = Math.round(num * 100) / 100;
  return { valid: true, value: rounded };
}

/**
 * Checks for prohibited attempts to pass arbitrary inventory or stock quantities
 * through the product catalog administration endpoints.
 */
export function assertNoInventoryPayload(body: Record<string, unknown>): { allowed: boolean; error?: string } {
  const prohibitedKeys = ["stock", "quantity", "inventory", "erp_quantity"];
  for (const key of prohibitedKeys) {
    if (key in body && body[key] !== undefined) {
      return {
        allowed: false,
        error: `Field '${key}' cannot be modified through the product catalog API. Inventory is managed independently via ERP snapshots.`,
      };
    }
  }
  return { allowed: true };
}

/**
 * Validates image URLs for relative paths or valid web protocols.
 */
export function isValidImageUrl(url: unknown): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  const clean = url.trim();
  if (clean.length > 2048) return false;
  return clean.startsWith("/") || clean.startsWith("https://") || clean.startsWith("http://");
}
