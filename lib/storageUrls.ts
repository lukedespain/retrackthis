import { AUDIO_BUCKET } from "@/lib/supabaseAdmin";

/** True when URL points at this app's Supabase audio bucket (public object URL). */
export function isAppStoragePublicUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const prefix = `${base}/storage/v1/object/public/${AUDIO_BUCKET}/`;
  return trimmed.startsWith(prefix);
}

export function assertAppStorageUrls(urls: Array<string | null | undefined>): string | null {
  for (const url of urls) {
    if (url == null || url === "") continue;
    if (!isAppStoragePublicUrl(url)) {
      return "File URL must be an upload from Retrack This storage.";
    }
  }
  return null;
}
