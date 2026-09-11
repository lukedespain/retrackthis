import { NextRequest, NextResponse } from "next/server";
import { ensureAudioPreview, storagePathFromPublicUrl } from "@/lib/audioPreview";
import { db } from "@/lib/db";
import { notifyCreatorTakeSubmitted } from "@/lib/notify";
import { getMusicianPayoutSnapshot } from "@/lib/musicianPayouts";
import { getSessionUserId } from "@/lib/supabaseServer";
import {
  MAX_AUDIO_TAKES,
  MAX_MIDI_FILES,
  parseTakeFileInputs,
  type TakeFileInput,
  type TakeFileRecord,
} from "@/lib/takeFiles";

type DbTakeFile = {
  id: string;
  kind: "AUDIO" | "MIDI";
  label: string;
  fileUrl: string;
  previewUrl: string | null;
  sortOrder: number;
  audioIndex: number | null;
};

function serializeFiles(
  files: DbTakeFile[],
  opts: { exposeMasters: boolean }
): TakeFileRecord[] {
  return files.map((f) => {
    if (f.kind === "MIDI") {
      return {
        id: f.id,
        kind: f.kind,
        label: f.label,
        fileUrl: opts.exposeMasters ? f.fileUrl : null,
        previewUrl: null,
        sortOrder: f.sortOrder,
        audioIndex: f.audioIndex,
      };
    }

    const previewUrl = f.previewUrl;
    // When a preview exists, hide the master until purchase/award.
    // If preview is missing (legacy / failed transcode), fall back to master for listening.
    const fileUrl = opts.exposeMasters ? f.fileUrl : previewUrl ? null : f.fileUrl;

    return {
      id: f.id,
      kind: f.kind,
      label: f.label,
      fileUrl,
      previewUrl: previewUrl ?? null,
      sortOrder: f.sortOrder,
      audioIndex: f.audioIndex,
    };
  });
}

function serializeTakeAudioFileUrl(
  take: { audioFileUrl: string; files: DbTakeFile[]; isWinner: boolean },
  exposeMasters: boolean
): string {
  if (exposeMasters) return take.audioFileUrl;
  const firstAudio = take.files.find((f) => f.kind === "AUDIO");
  if (firstAudio?.previewUrl) return firstAudio.previewUrl;
  return take.audioFileUrl;
}

async function ensurePreviewForAudio(file: TakeFileInput): Promise<TakeFileInput> {
  if (file.previewUrl) return file;
  const path = storagePathFromPublicUrl(file.fileUrl);
  if (!path) return file;
  try {
    const { previewUrl } = await ensureAudioPreview({
      originalPath: path,
      originalPublicUrl: file.fileUrl,
    });
    return { ...file, previewUrl };
  } catch (err) {
    console.error("[takes] preview ensure failed", err);
    return file;
  }
}

const takeInclude = {
  musician: { select: { id: true, name: true } },
  files: { orderBy: { sortOrder: "asc" as const } },
};

// POST /api/jobs/:jobId/takes - a musician submits their recorded take(s)
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const musicianId = await getSessionUserId();
  if (!musicianId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const payout = await getMusicianPayoutSnapshot(musicianId);
  if (!payout.ready) {
    return NextResponse.json(
      {
        error:
          payout.status === "pending"
            ? "Finish payout setup before submitting a take."
            : "Set up payouts before submitting a take.",
        code: payout.status === "pending" ? "PAYOUTS_PENDING" : "PAYOUTS_REQUIRED",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { note, attestHuman, audioFileUrl: legacyAudioUrl } = body;

  if (!attestHuman) {
    return NextResponse.json(
      { error: "You must confirm this take is a real human performance, not AI-generated." },
      { status: 400 }
    );
  }

  let audioTakes = parseTakeFileInputs(body.audioTakes, "AUDIO", MAX_AUDIO_TAKES);
  const midiFiles = parseTakeFileInputs(body.midiFiles, "MIDI", MAX_MIDI_FILES);

  if (audioTakes.length === 0 && legacyAudioUrl) {
    audioTakes.push({ label: "Take 1", fileUrl: String(legacyAudioUrl) });
  }

  if (audioTakes.length === 0 && midiFiles.length === 0) {
    return NextResponse.json(
      { error: "Upload at least one audio take or MIDI file before submitting." },
      { status: 400 }
    );
  }

  const job = await db.job.findUnique({ where: { id: params.jobId } });
  if (!job || job.status !== "OPEN") {
    return NextResponse.json({ error: "Job is not open for submissions" }, { status: 400 });
  }

  // Best-effort: ensure MP3 previews exist before persisting (covers client timeout / skip).
  audioTakes = await Promise.all(audioTakes.map((f) => ensurePreviewForAudio(f)));

  // MIDI-only takes store the first MIDI URL in audioFileUrl for legacy list UIs.
  const primaryAudioUrl = audioTakes[0]?.fileUrl ?? midiFiles[0]?.fileUrl ?? "";
  const fileCreates = [
    ...audioTakes.map((file, index) => ({
      kind: "AUDIO" as const,
      label: file.label,
      fileUrl: file.fileUrl,
      previewUrl: file.previewUrl ?? null,
      sortOrder: index,
    })),
    ...midiFiles.map((file, index) => ({
      kind: "MIDI" as const,
      label: file.label,
      fileUrl: file.fileUrl,
      previewUrl: null as string | null,
      sortOrder: index,
      audioIndex: file.audioIndex ?? null,
    })),
  ];

  const existing = await db.take.findFirst({
    where: { jobId: params.jobId, musicianId },
  });

  if (existing) {
    if (existing.isWinner) {
      return NextResponse.json({ error: "This take was already selected and can’t be replaced." }, { status: 400 });
    }

    const take = await db.$transaction(async (tx) => {
      await tx.takeFile.deleteMany({ where: { takeId: existing.id } });
      return tx.take.update({
        where: { id: existing.id },
        data: {
          audioFileUrl: primaryAudioUrl,
          note: note || null,
          humanAttestedAt: new Date(),
          submittedAt: new Date(),
          files: { create: fileCreates },
        },
        include: takeInclude,
      });
    });

    await notifyCreatorTakeSubmitted({
      job: { id: job.id, title: job.title, creatorId: job.creatorId },
      musicianName: take.musician.name,
      replaced: true,
    });

    return NextResponse.json({
      ...take,
      audioFileUrl: take.audioFileUrl,
      files: serializeFiles(take.files, { exposeMasters: true }),
      replaced: true,
    });
  }

  const take = await db.take.create({
    data: {
      jobId: params.jobId,
      musicianId,
      audioFileUrl: primaryAudioUrl,
      note: note || null,
      humanAttestedAt: new Date(),
      files: { create: fileCreates },
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
      files: serializeFiles(take.files, { exposeMasters: true }),
    },
    { status: 201 }
  );
}

// GET /api/jobs/:jobId/takes - creator (or admin) reviews submitted takes.
// Audio is not public: musicians on the board only see a count, not files.
export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    select: { id: true, creatorId: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  let isAdmin = false;
  const isCreator = job.creatorId === sessionUserId;
  if (!isCreator) {
    const { getAdminUser } = await import("@/lib/admin");
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Not authorized to listen to these takes" }, { status: 403 });
    }
    isAdmin = true;
  }

  const takes = await db.take.findMany({
    where: { jobId: params.jobId },
    include: takeInclude,
    orderBy: { submittedAt: "asc" },
  });

  return NextResponse.json(
    takes.map((take) => {
      const exposeMasters = isAdmin || take.isWinner;
      return {
        ...take,
        audioFileUrl: serializeTakeAudioFileUrl(take, exposeMasters),
        files: serializeFiles(take.files, { exposeMasters }),
      };
    })
  );
}
