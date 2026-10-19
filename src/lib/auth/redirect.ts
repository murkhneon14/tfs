/**
 * Validates a redirect destination to guarantee it is a safe relative internal path.
 * Protects against open redirect attacks (e.g., //attacker.com, /\attacker.com, http://, javascript:).
 */
export function getSafeRedirectUrl(target: string | null | undefined, fallback: string = "/"): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();

  // Must begin with a single slash, not double slash or backslash
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes("://") &&
    !trimmed.toLowerCase().startsWith("/javascript:")
  ) {
    return trimmed;
  }

  return fallback;
}
