import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { ensureAudioPreview, storagePathFromPublicUrl } from "@/lib/audioPreview";
import { isTakeFileName } from "@/lib/constants";
import { db } from "@/lib/db";
import { notifyMusicianTakeEditedByAdmin } from "@/lib/notify";
import { assertAppStorageUrls } from "@/lib/storageUrls";

type Replace = { fileId: string; fileUrl: string; previewUrl: string | null; label: string };

// PATCH /api/admin/takes/:takeId { replace: [{ fileId, fileUrl, previewUrl?, label }], remove: [fileId], note }
// An admin fixes a musician's take, usually because the musician asked for help lining it
// up with the bed. Every change saves at once and the note is emailed to the musician.
// Replaced and removed files stay in storage so a change can be undone by hand.
export async function PATCH(req: NextRequest, { params }: { params: { takeId: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  const remove: string[] = Array.isArray(body?.remove) ? body.remove.filter((id: unknown) => typeof id === "string") : [];
  const replace: Replace[] = Array.isArray(body?.replace)
    ? body.replace
        .filter((r: Partial<Replace>) => typeof r?.fileId === "string" && typeof r?.fileUrl === "string")
        .map((r: Partial<Replace>) => ({
          fileId: r.fileId as string,
          fileUrl: r.fileUrl as string,
          previewUrl: typeof r.previewUrl === "string" ? r.previewUrl : null,
          label: typeof r.label === "string" && r.label.trim() ? r.label.trim().slice(0, 200) : "",
        }))
    : [];

  if (replace.length === 0 && remove.length === 0) {
    return NextResponse.json({ error: "Replace or remove a file first." }, { status: 400 });
  }
  if (!note) return NextResponse.json({ error: "Add a note for the musician." }, { status: 400 });
  if (note.length > 2000) return NextResponse.json({ error: "Keep the note under 2,000 characters." }, { status: 400 });
  if (replace.some((r) => !isTakeFileName(r.fileUrl))) {
    return NextResponse.json({ error: "Takes must be WAV or MP3 files." }, { status: 400 });
  }
  const storageError = assertAppStorageUrls(replace.flatMap((r) => [r.fileUrl, r.previewUrl]));
  if (storageError) return NextResponse.json({ error: storageError }, { status: 400 });

  const take = await db.take.findUnique({
    where: { id: params.takeId },
    include: {
      job: { select: { title: true, status: true, isTest: true } },
      files: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!take) return NextResponse.json({ error: "Take not found" }, { status: 404 });
  if (take.job.status !== "OPEN") {
    return NextResponse.json({ error: "This job is closed, so its takes can’t be changed." }, { status: 400 });
  }

  const audio = take.files.filter((f) => f.kind === "AUDIO");
  const byId = new Map(audio.map((f) => [f.id, f]));
  if ([...remove, ...replace.map((r) => r.fileId)].some((id) => !byId.has(id))) {
    return NextResponse.json({ error: "One of those files isn’t in this take." }, { status: 400 });
  }
  const kept = audio.filter((f) => !remove.includes(f.id));
  if (kept.length === 0) {
    return NextResponse.json({ error: "A take needs at least one file." }, { status: 400 });
  }

  // Previews the browser couldn't make.
  for (const r of replace) {
    if (r.previewUrl) continue;
    const path = storagePathFromPublicUrl(r.fileUrl);
    if (!path) continue;
    try {
      r.previewUrl = (await ensureAudioPreview({ originalPath: path, originalPublicUrl: r.fileUrl })).previewUrl ?? null;
    } catch (err) {
      console.error("[admin take edit] preview failed", err);
    }
  }

  const changes: string[] = [];
  await db.$transaction(async (tx) => {
    for (const id of remove) {
      await tx.takeFile.delete({ where: { id } });
      changes.push(`Removed “${byId.get(id)!.label}”`);
    }
    for (const r of replace) {
      if (remove.includes(r.fileId)) continue;
      const old = byId.get(r.fileId)!;
      const label = r.label || old.label;
      await tx.takeFile.update({
        where: { id: r.fileId },
        data: { fileUrl: r.fileUrl, previewUrl: r.previewUrl, label },
      });
      changes.push(label === old.label ? `Replaced “${old.label}”` : `Replaced “${old.label}” with “${label}”`);
    }
    // Keep the files numbered from 0, and the take's primary audio on its first file.
    for (const [index, f] of kept.entries()) {
      if (f.sortOrder !== index) await tx.takeFile.update({ where: { id: f.id }, data: { sortOrder: index } });
    }
    const first = replace.find((r) => r.fileId === kept[0].id)?.fileUrl ?? kept[0].fileUrl;
    await tx.take.update({ where: { id: take.id }, data: { audioFileUrl: first } });
  });

  if (!take.job.isTest) {
    await notifyMusicianTakeEditedByAdmin({
      musicianId: take.musicianId,
      jobTitle: take.job.title,
      changes,
      note,
    });
  }

  return NextResponse.json({ ok: true });
}
