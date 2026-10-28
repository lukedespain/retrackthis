import { ensureAudioPreview, storagePathFromPublicUrl } from "@/lib/audioPreview";

/**
 * Stream preview for one job file (demo or bed). Null when the file is already light
 * enough to stream, or when the preview could not be made: players fall back to the file.
 */
export async function jobFilePreviewUrl(fileUrl: string | null | undefined): Promise<string | null> {
  if (!fileUrl) return null;
  const originalPath = storagePathFromPublicUrl(fileUrl);
  if (!originalPath) return null;
  try {
    const { previewUrl } = await ensureAudioPreview({ originalPath, originalPublicUrl: fileUrl });
    return previewUrl === fileUrl ? null : previewUrl;
  } catch (err) {
    console.error("[jobPreviews]", fileUrl, err);
    return null;
  }
}

/** Previews for a job's demo and bed. Website uploads already made them, so this is usually a quick lookup. */
export async function jobPreviewUrls(demoFileUrl: string, backingFileUrl: string | null) {
  const [demoPreviewUrl, backingPreviewUrl] = await Promise.all([
    jobFilePreviewUrl(demoFileUrl),
    jobFilePreviewUrl(backingFileUrl),
  ]);
  return { demoPreviewUrl, backingPreviewUrl };
}
