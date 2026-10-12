// Instruments picked before an account exists (Find Work → sign-up → onboarding).
// Stored two ways: localStorage covers Google sign-up in the same browser, and
// Supabase user_metadata (set at email sign-up) survives a confirm link opened elsewhere.
// Values are untrusted; the server sanitizes ids on save (sanitizeInstrumentIds).

const KEY = "rt_pending_instruments";

export function parseInstrumentParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[a-z0-9:_-]{1,80}$/i.test(id))
    .slice(0, 40);
}

export function savePendingInstruments(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
}

export function readPendingInstruments(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function clearPendingInstruments() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
