import { createClient } from "@supabase/supabase-js";
import { MAX_AUDIO_UPLOAD_BYTES } from "@/lib/constants";

// Server-only client using the service role key — never import this from
// client components. Used to mint signed upload URLs and manage the bucket.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const AUDIO_BUCKET = "audio-files";

let bucketReadyPromise: Promise<void> | null = null;

// Lazily creates (or syncs) the bucket on first use so local setup doesn't
// require a manual dashboard step. Public read (so <audio> tags can play
// files directly); the file-size cap is enforced by Supabase Storage
// itself on every upload, not just client-side.
export function ensureAudioBucket() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === AUDIO_BUCKET);
      if (!exists) {
        await supabaseAdmin.storage.createBucket(AUDIO_BUCKET, {
          public: true,
          fileSizeLimit: MAX_AUDIO_UPLOAD_BYTES,
        });
      } else {
        await supabaseAdmin.storage.updateBucket(AUDIO_BUCKET, {
          public: true,
          fileSizeLimit: MAX_AUDIO_UPLOAD_BYTES,
        });
      }
    })();
  }
  return bucketReadyPromise;
}
