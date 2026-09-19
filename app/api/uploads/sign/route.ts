import { NextRequest, NextResponse } from "next/server";
import { AUDIO_BUCKET, ensureAudioBucket, supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSessionUserId } from "@/lib/supabaseServer";

const ALLOWED_KINDS = new Set(["demo", "demo-backing", "take", "take-midi"]);

const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/aiff",
  "audio/x-aiff",
  "audio/flac",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/midi",
  "audio/x-midi",
  "audio/mid",
  // Browsers sometimes send MIDI / WAV as octet-stream
  "application/octet-stream",
];

// POST /api/uploads/sign { fileName, kind } - mints a signed Supabase
// Storage upload URL so the browser can upload the file directly
// (bytes never pass through our server). kind namespaces the storage path.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const fileName = body?.fileName;
  const kind = body?.kind;

  if (!fileName || !kind || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "Missing fileName or kind" }, { status: 400 });
  }

  await ensureAudioBucket();

  // Keep mime allow-list in sync on the bucket (best-effort; don't block upload minting).
  try {
    await supabaseAdmin.storage.updateBucket(AUDIO_BUCKET, {
      public: true,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
  } catch (err) {
    console.warn("[uploads/sign] could not sync allowedMimeTypes", err);
  }

  const safeName = String(fileName).replace(/[^a-zA-Z0-9.\-_]/g, "_");
  // Namespace by user so uploads are attributable and paths aren't guessable globally.
  const path = `${kind}/${userId}/${crypto.randomUUID()}-${safeName}`;

  const { data, error } = await supabaseAdmin.storage.from(AUDIO_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create signed upload URL" }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(AUDIO_BUCKET).getPublicUrl(path);

  return NextResponse.json({
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: publicUrlData.publicUrl,
  });
}
