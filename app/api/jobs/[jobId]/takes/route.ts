import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyCreatorTakeSubmitted } from "@/lib/notify";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/jobs/:jobId/takes — a musician submits their recorded take
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const musicianId = await getSessionUserId();
  if (!musicianId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const { audioFileUrl, note, attestHuman } = body;

  if (!attestHuman) {
    return NextResponse.json(
      { error: "You must confirm this take is a real human performance, not AI-generated." },
      { status: 400 }
    );
  }

  if (!audioFileUrl) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  const job = await db.job.findUnique({ where: { id: params.jobId } });
  if (!job || job.status !== "OPEN") {
    return NextResponse.json({ error: "Job is not open for submissions" }, { status: 400 });
  }

  const take = await db.take.create({
    data: {
      jobId: params.jobId,
      musicianId,
      audioFileUrl,
      note: note || null,
      humanAttestedAt: new Date(),
    },
    include: { musician: { select: { name: true } } },
  });

  await notifyCreatorTakeSubmitted({
    job: { id: job.id, title: job.title, creatorId: job.creatorId },
    musicianName: take.musician.name,
  });

  return NextResponse.json(take, { status: 201 });
}

// GET /api/jobs/:jobId/takes — creator reviews all submitted takes
export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const takes = await db.take.findMany({
    where: { jobId: params.jobId },
    include: { musician: { select: { id: true, name: true } } },
    orderBy: { submittedAt: "asc" },
  });
  return NextResponse.json(takes);
}
