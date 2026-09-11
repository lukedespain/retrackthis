import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import ffmpegPath from "ffmpeg-static";
import { AUDIO_BUCKET, supabaseAdmin } from "@/lib/supabaseAdmin";

const PREVIEW_BITRATE = "192k";

/** Formats that are already light enough to stream as-is. */
export function isAlreadyStreamFriendly(fileNameOrUrl: string): boolean {
  const lower = fileNameOrUrl.toLowerCase().split("?")[0] ?? "";
  return /\.(mp3|m4a|aac|ogg|opus)$/i.test(lower);
}

function previewPathFromOriginal(originalPath: string): string {
  const base = originalPath.replace(/\.[^.]+$/, "");
  return `${base}.preview.mp3`;
}

/**
 * Extract the storage object path from a public Supabase audio URL, if ours.
 */
export function storagePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/object/public/${AUDIO_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

async function runFfmpegToMp3(inputPath: string, outputPath: string): Promise<void> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg binary is not available on this server");
  }

  await new Promise<void>((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      PREVIEW_BITRATE,
      "-ar",
      "44100",
      "-ac",
      "2",
      outputPath,
    ];
    const child = spawn(ffmpegPath as string, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-4000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-500)}`));
    });
  });
}

/**
 * Create (or reuse) an MP3 preview for a stored audio object.
 * Returns the public preview URL. For already-compressed formats, returns the original URL.
 */
export async function ensureAudioPreview(opts: {
  originalPath: string;
  originalPublicUrl: string;
  fileNameHint?: string;
}): Promise<{ previewUrl: string; created: boolean }> {
  const hint = opts.fileNameHint ?? opts.originalPath;
  if (isAlreadyStreamFriendly(hint) || isAlreadyStreamFriendly(opts.originalPublicUrl)) {
    return { previewUrl: opts.originalPublicUrl, created: false };
  }

  const previewObjectPath = previewPathFromOriginal(opts.originalPath);
  const { data: publicUrlData } = supabaseAdmin.storage.from(AUDIO_BUCKET).getPublicUrl(previewObjectPath);

  // Cheap existence check via download head-ish: try download with limit by listing parent.
  const parent = previewObjectPath.includes("/")
    ? previewObjectPath.split("/").slice(0, -1).join("/")
    : "";
  const leaf = previewObjectPath.split("/").pop() ?? "";
  const { data: existing } = await supabaseAdmin.storage.from(AUDIO_BUCKET).list(parent, {
    search: leaf,
    limit: 5,
  });
  if (existing?.some((f) => f.name === leaf)) {
    return { previewUrl: publicUrlData.publicUrl, created: false };
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "retrack-preview-"));
  const inputPath = path.join(tmpDir, "input");
  const outputPath = path.join(tmpDir, "preview.mp3");

  try {
    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .download(opts.originalPath);
    if (downloadError || !blob) {
      throw new Error(downloadError?.message ?? "Could not download original audio");
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    await fs.writeFile(inputPath, buffer);
    await runFfmpegToMp3(inputPath, outputPath);

    const mp3 = await fs.readFile(outputPath);
    const { error: uploadError } = await supabaseAdmin.storage.from(AUDIO_BUCKET).upload(previewObjectPath, mp3, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (uploadError) throw new Error(uploadError.message);

    return { previewUrl: publicUrlData.publicUrl, created: true };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
