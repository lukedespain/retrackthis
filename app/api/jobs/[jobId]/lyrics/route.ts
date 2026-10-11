import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatTranscribedLyrics, isVocalPart } from "@/lib/lyrics";
import { transcribePartLyrics } from "@/lib/transcribeLyrics";
import { getSessionUserId } from "@/lib/supabaseServer";

export const maxDuration = 60;

// POST /api/jobs/:jobId/lyrics — fill lyrics from the vocal part, unless the producer already edited them.
export async function POST(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const job = await db.job.findUnique({ where: { id: params.jobId } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const isOwner = job.creatorId === sessionUserId;
  const admin = isOwner ? null : await getAdminUser();
  if (!isOwner && !admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (!isVocalPart(job)) return NextResponse.json({ error: "Lyrics are for vocal jobs." }, { status: 400 });
  if (job.lyricsEdited) return NextResponse.json({ lyrics: job.lyrics, edited: true });
  if (job.lyrics?.trim()) return NextResponse.json({ lyrics: job.lyrics, edited: false });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ lyrics: null, unavailable: true });
  }

  try {
    const text = await transcribePartLyrics(job.demoFileUrl);
    const lyrics = formatTranscribedLyrics(text ?? "");
    const current = await db.job.findUnique({ where: { id: job.id }, select: { lyricsEdited: true } });
    if (current?.lyricsEdited) return NextResponse.json({ lyrics: job.lyrics, edited: true });
    const updated = await db.job.update({
      where: { id: job.id },
      data: { lyrics: lyrics || null },
    });
    return NextResponse.json({ lyrics: updated.lyrics, edited: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not transcribe that vocal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
