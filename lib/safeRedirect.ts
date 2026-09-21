/**
 * Only allow same-origin relative paths for post-login redirects.
 * Uses the URL parser so tab/CR/LF and backslash tricks cannot escape.
 */
export function safeInternalPath(next: string | null | undefined, fallback = "/producers"): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || /[\x00-\x1f]/.test(trimmed)) {
    return fallback;
  }
  try {
    const origin = "https://retrackthis.invalid";
    const url = new URL(trimmed, origin);
    if (url.origin !== origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
