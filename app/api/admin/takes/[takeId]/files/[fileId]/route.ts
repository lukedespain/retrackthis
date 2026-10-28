import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { ensureAudioPreview, storagePathFromPublicUrl } from "@/lib/audioPreview";
import { isTakeFileName } from "@/lib/constants";
import { db } from "@/lib/db";
import { notifyMusicianTakeEditedByAdmin } from "@/lib/notify";
import { assertAppStorageUrls } from "@/lib/storageUrls";

// PUT /api/admin/takes/:takeId/files/:fileId { fileUrl, previewUrl?, note }
// An admin replaces one audio file in a musician's take, usually because the musician
// asked for help lining it up with the bed. The note is emailed to the musician.
// The old file stays in storage so the change can be undone by hand.
export async function PUT(
  req: NextRequest,
  { params }: { params: { takeId: string; fileId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const fileUrl = typeof body?.fileUrl === "string" ? body.fileUrl : "";
  let previewUrl = typeof body?.previewUrl === "string" ? body.previewUrl : null;
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!fileUrl) return NextResponse.json({ error: "Upload the new file first." }, { status: 400 });
  if (!note) return NextResponse.json({ error: "Add a note for the musician." }, { status: 400 });
  if (note.length > 2000) return NextResponse.json({ error: "Keep the note under 2,000 characters." }, { status: 400 });
  if (!isTakeFileName(fileUrl)) return NextResponse.json({ error: "Takes must be WAV or MP3 files." }, { status: 400 });
  const storageError = assertAppStorageUrls([fileUrl, previewUrl]);
  if (storageError) return NextResponse.json({ error: storageError }, { status: 400 });

  const file = await db.takeFile.findUnique({
    where: { id: params.fileId },
    include: { take: { include: { job: { select: { id: true, title: true, status: true, isTest: true } } } } },
  });
  if (!file || file.takeId !== params.takeId || file.kind !== "AUDIO") {
    return NextResponse.json({ error: "Take file not found" }, { status: 404 });
  }
  if (file.take.job.status !== "OPEN") {
    return NextResponse.json({ error: "This job is closed, so its takes can’t be changed." }, { status: 400 });
  }

  if (!previewUrl) {
    const path = storagePathFromPublicUrl(fileUrl);
    if (path) {
      try {
        ({ previewUrl } = await ensureAudioPreview({ originalPath: path, originalPublicUrl: fileUrl }));
      } catch (err) {
        console.error("[admin take file] preview failed", err);
      }
    }
  }

  await db.$transaction(async (tx) => {
    await tx.takeFile.update({ where: { id: file.id }, data: { fileUrl, previewUrl: previewUrl ?? null } });
    // The take's primary audio is its first file.
    const first = await tx.takeFile.findFirst({
      where: { takeId: file.takeId, kind: "AUDIO" },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    if (first?.id === file.id) {
      await tx.take.update({ where: { id: file.takeId }, data: { audioFileUrl: fileUrl } });
    }
  });

  if (!file.take.job.isTest) {
    await notifyMusicianTakeEditedByAdmin({
      musicianId: file.take.musicianId,
      jobTitle: file.take.job.title,
      fileLabel: file.label,
      note,
    });
  }

  return NextResponse.json({ ok: true, previewUrl: previewUrl ?? null });
}
