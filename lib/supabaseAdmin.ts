import { createClient } from "@supabase/supabase-js";
import { MAX_AUDIO_UPLOAD_BYTES, MAX_AUDIO_UPLOAD_MB } from "@/lib/constants";

// Server-only client using the service role key - never import this from
// client components. Used to mint signed upload URLs and manage the bucket.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const AUDIO_BUCKET = "audio-files";

let bucketReadyPromise: Promise<void> | null = null;

async function setBucketFileSizeLimit(bytes: number) {
  const { error } = await supabaseAdmin.storage.updateBucket(AUDIO_BUCKET, {
    public: true,
    fileSizeLimit: bytes,
  });
  return error;
}

// Lazily creates (or syncs) the bucket on first use so local setup doesn't
// require a manual dashboard step. Public read (so <audio> tags can play
// files directly); the file-size cap is enforced by Supabase Storage
// itself on every upload, not just client-side.
export function ensureAudioBucket() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      try {
        const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
        if (listError) throw listError;

        const exists = buckets?.some((b) => b.name === AUDIO_BUCKET);
        if (!exists) {
          const { error } = await supabaseAdmin.storage.createBucket(AUDIO_BUCKET, {
            public: true,
            fileSizeLimit: MAX_AUDIO_UPLOAD_BYTES,
          });
          if (error) throw error;
          return;
        }

        const updateError = await setBucketFileSizeLimit(MAX_AUDIO_UPLOAD_BYTES);
        if (updateError) {
          console.error(
            `[storage] Could not set audio bucket limit to ${MAX_AUDIO_UPLOAD_MB}MB:`,
            updateError.message
          );
          // Still allow uploads against whatever limit the project already has.
        }
      } catch (err) {
        // Allow the next request to retry instead of caching a failed setup.
        bucketReadyPromise = null;
        throw err;
      }
    })();
  }
  return bucketReadyPromise;
}
