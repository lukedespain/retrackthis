import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyCreatorTakeSubmitted } from "@/lib/notify";
import { getSessionUserId } from "@/lib/supabaseServer";
import {
  MAX_AUDIO_TAKES,
  MAX_MIDI_FILES,
  parseTakeFileInputs,
  type TakeFileRecord,
} from "@/lib/takeFiles";

function serializeFiles(
  files: Array<{
    id: string;
    kind: "AUDIO" | "MIDI";
    label: string;
    fileUrl: string;
    sortOrder: number;
    audioIndex: number | null;
  }>
): TakeFileRecord[] {
  return files.map((f) => ({
    id: f.id,
    kind: f.kind,
    label: f.label,
    fileUrl: f.fileUrl,
    sortOrder: f.sortOrder,
    audioIndex: f.audioIndex,
  }));
}

const takeInclude = {
  musician: { select: { id: true, name: true } },
  files: { orderBy: { sortOrder: "asc" as const } },
};

// POST /api/jobs/:jobId/takes — a musician submits their recorded take(s)
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const musicianId = await getSessionUserId();
  if (!musicianId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const { note, attestHuman, audioFileUrl: legacyAudioUrl } = body;

  if (!attestHuman) {
    return NextResponse.json(
      { error: "You must confirm this take is a real human performance, not AI-generated." },
      { status: 400 }
    );
  }

  const audioTakes = parseTakeFileInputs(body.audioTakes, "AUDIO", MAX_AUDIO_TAKES);
  const midiFiles = parseTakeFileInputs(body.midiFiles, "MIDI", MAX_MIDI_FILES);

  if (audioTakes.length === 0 && legacyAudioUrl) {
    audioTakes.push({ label: "Take 1", fileUrl: String(legacyAudioUrl) });
  }

  if (audioTakes.length === 0) {
    return NextResponse.json({ error: "Upload at least one audio take before submitting." }, { status: 400 });
  }

  const job = await db.job.findUnique({ where: { id: params.jobId } });
  if (!job || job.status !== "OPEN") {
    return NextResponse.json({ error: "Job is not open for submissions" }, { status: 400 });
  }

  const existing = await db.take.findFirst({
    where: { jobId: params.jobId, musicianId },
  });
  if (existing) {
    return NextResponse.json({ error: "You already submitted a take for this job." }, { status: 400 });
  }

  const primaryAudioUrl = audioTakes[0].fileUrl;

  const take = await db.take.create({
    data: {
      jobId: params.jobId,
      musicianId,
      audioFileUrl: primaryAudioUrl,
      note: note || null,
      humanAttestedAt: new Date(),
      files: {
        create: [
          ...audioTakes.map((file, index) => ({
            kind: "AUDIO" as const,
            label: file.label,
            fileUrl: file.fileUrl,
            sortOrder: index,
          })),
          ...midiFiles.map((file, index) => ({
            kind: "MIDI" as const,
            label: file.label,
            fileUrl: file.fileUrl,
            sortOrder: index,
            audioIndex: file.audioIndex ?? null,
          })),
        ],
      },
    },
    include: takeInclude,
  });

  await notifyCreatorTakeSubmitted({
    job: { id: job.id, title: job.title, creatorId: job.creatorId },
    musicianName: take.musician.name,
  });

  return NextResponse.json(
    {
      ...take,
      files: serializeFiles(take.files),
    },
    { status: 201 }
  );
}

// GET /api/jobs/:jobId/takes — creator reviews all submitted takes
export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const takes = await db.take.findMany({
    where: { jobId: params.jobId },
    include: takeInclude,
    orderBy: { submittedAt: "asc" },
  });

  return NextResponse.json(
    takes.map((take) => ({
      ...take,
      files: serializeFiles(take.files),
    }))
  );
}
