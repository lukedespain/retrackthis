import { ensureAudioPreview, storagePathFromPublicUrl } from "@/lib/audioPreview";
import { AUDIO_BUCKET, ensureAudioBucket } from "@/lib/supabaseAdmin";
import { getSessionUserId } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/uploads/preview
 * Body: { path?: string, publicUrl: string, fileName?: string }
 * Creates an MP3 preview for streaming. Already-compressed audio reuses the original URL.
 */
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    path?: string;
    publicUrl?: string;
    fileName?: string;
  };

  const publicUrl = typeof body.publicUrl === "string" ? body.publicUrl.trim() : "";
  if (!publicUrl) {
    return NextResponse.json({ error: "Missing publicUrl" }, { status: 400 });
  }

  let originalPath = typeof body.path === "string" ? body.path.trim() : "";
  if (!originalPath) {
    originalPath = storagePathFromPublicUrl(publicUrl) ?? "";
  }
  if (!originalPath || originalPath.includes("..")) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
  }

  // Only allow our audio bucket namespaces.
  if (!/^(take|demo|demo-backing)\//.test(originalPath)) {
    return NextResponse.json({ error: "Preview only supported for audio uploads" }, { status: 400 });
  }

  try {
    await ensureAudioBucket();
    const result = await ensureAudioPreview({
      originalPath,
      originalPublicUrl: publicUrl,
      fileNameHint: body.fileName ?? originalPath,
    });
    return NextResponse.json({
      previewUrl: result.previewUrl,
      created: result.created,
      bucket: AUDIO_BUCKET,
    });
  } catch (err) {
    console.error("[uploads/preview]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not create preview",
        // Client may fall back to streaming the original for the uploader only.
        previewUrl: null,
      },
      { status: 500 }
    );
  }
}
