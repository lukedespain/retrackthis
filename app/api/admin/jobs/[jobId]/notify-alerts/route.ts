import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { notifyNewJobPosted } from "@/lib/notify";

/**
 * Admin: re-send “new job matches your instruments” emails.
 * POST /api/admin/jobs/:jobId/notify-alerts
 */
export async function POST(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY missing)." },
      { status: 503 }
    );
  }

  const job = await db.job.findUnique({
    where: { id: params.jobId },
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

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "OPEN") {
    return NextResponse.json(
      { error: "Alerts only make sense for open jobs." },
      { status: 400 }
    );
  }

  const recipientCount = await notifyNewJobPosted(job);

  return NextResponse.json({
    success: true,
    jobId: job.id,
    instrument: job.instrument,
    instrumentId: job.instrumentId,
    recipientCount,
  });
}
