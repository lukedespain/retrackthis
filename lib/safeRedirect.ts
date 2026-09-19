/**
 * Only allow same-origin relative paths for post-login redirects.
 * Blocks open redirects like ?next=https://evil.com
 */
export function safeInternalPath(next: string | null | undefined, fallback = "/producers"): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return fallback;
  }
  // Block backslash tricks / protocol-relative variants
  if (trimmed.includes("\\")) return fallback;
  return trimmed;
}
