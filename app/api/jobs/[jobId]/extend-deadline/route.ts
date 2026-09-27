import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { db } from "@/lib/db";
import { DEADLINE_EXTENSION_DAYS, MAX_DEADLINE_DAYS } from "@/lib/jobPricing";
import { notifyJobDeadlineExtended } from "@/lib/notify";
import { getSessionUserId } from "@/lib/supabaseServer";

export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

// POST /api/jobs/:jobId/extend-deadline - creator or admin adds
// DEADLINE_EXTENSION_DAYS to an open, paid job, then emails matching musicians.
// The 48h award window keys off `deadline`, so it moves with the extension.
export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    include: { payment: { select: { status: true } } },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isOwner = job.creatorId === sessionUserId;
  const admin = isOwner ? null : await getAdminUser();
  if (!isOwner && !admin) {
    return NextResponse.json({ error: "Not authorized to extend this job" }, { status: 403 });
  }

  if (job.status !== "OPEN") {
    return NextResponse.json({ error: "Only open jobs can be extended" }, { status: 400 });
  }
  if (job.deadline.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "This job’s deadline already passed. Award a take or let it close." },
      { status: 400 }
    );
  }
  if (job.payment?.status !== "captured") {
    return NextResponse.json(
      { error: "Only jobs paid upfront can be extended." },
      { status: 400 }
    );
  }

  const newDeadline = new Date(job.deadline.getTime() + DEADLINE_EXTENSION_DAYS * DAY_MS);
  if (newDeadline.getTime() > Date.now() + MAX_DEADLINE_DAYS * DAY_MS) {
    return NextResponse.json(
      { error: `Deadlines can’t be more than ${MAX_DEADLINE_DAYS} days out.` },
      { status: 400 }
    );
  }

  // Conditional on the current deadline so a double-click can't extend twice.
  const { count } = await db.job.updateMany({
    where: { id: job.id, status: "OPEN", deadline: job.deadline },
    data: {
      deadline: newDeadline,
      deadlineExtendedAt: new Date(),
      threeDayReminderSentAt: null,
    },
  });
  if (count === 0) {
    return NextResponse.json(
      { error: "This job just changed. Refresh and try again." },
      { status: 409 }
    );
  }

  const notified = await notifyJobDeadlineExtended(
    {
      id: job.id,
      title: job.title,
      instrument: job.instrument,
      instrumentId: job.instrumentId,
      description: job.description,
      priceCents: job.priceCents,
      deadline: newDeadline,
      creatorId: job.creatorId,
    },
    DEADLINE_EXTENSION_DAYS
  );

  return NextResponse.json({
    deadline: newDeadline.toISOString(),
    notified,
    extendedByAdmin: Boolean(admin),
  });
}
