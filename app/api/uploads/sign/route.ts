import { NextRequest, NextResponse } from "next/server";
import { AUDIO_BUCKET, ensureAudioBucket, supabaseAdmin } from "@/lib/supabaseAdmin";

// POST /api/uploads/sign { fileName, kind } — mints a signed Supabase
// Storage upload URL so the browser can upload the file directly
// (bytes never pass through our server). kind namespaces the storage path.
export async function POST(req: NextRequest) {
  const { fileName, kind } = await req.json();

  const allowedKinds = new Set(["demo", "take", "take-midi"]);
  if (!fileName || !kind || !allowedKinds.has(kind)) {
    return NextResponse.json({ error: "Missing fileName or kind" }, { status: 400 });
  }

  await ensureAudioBucket();

  const safeName = String(fileName).replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${kind}/${crypto.randomUUID()}-${safeName}`;

  const { data, error } = await supabaseAdmin.storage.from(AUDIO_BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create signed upload URL" }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(AUDIO_BUCKET).getPublicUrl(path);

  return NextResponse.json({
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: publicUrlData.publicUrl,
  });
}
