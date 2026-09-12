import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { notifyJobThreeDaysLeft } from "@/lib/notify";

type Params = { params: Promise<{ jobId: string }> };

/**
 * POST /api/admin/jobs/:jobId/three-day-reminder
 * Force-send the "3 days left" email for one OPEN job (skips people who already submitted).
 */
export async function POST(_req: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { jobId } = await params;
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      instrument: true,
      instrumentId: true,
      description: true,
      priceCents: true,
      deadline: true,
      creatorId: true,
      status: true,
    },
  });

  if (!job || job.status !== "OPEN") {
    return NextResponse.json({ error: "Open job not found" }, { status: 404 });
  }

  const recipients = await notifyJobThreeDaysLeft(job);
  await db.job.update({
    where: { id: job.id },
    data: { threeDayReminderSentAt: new Date() },
  });

  return NextResponse.json({ ok: true, jobId: job.id, recipients });
}
