import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

/**
 * POST /api/jobs/:jobId/restore-draft
 * Unpaid jobs that were discarded as CANCELLED can be restored to PENDING_PAYMENT (Draft).
 */
export async function POST(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const creatorId = await getSessionUserId();
  if (!creatorId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    include: { payment: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.creatorId !== creatorId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (job.status !== "CANCELLED") {
    return NextResponse.json({ error: "Only cancelled jobs can be restored" }, { status: 400 });
  }

  const pay = job.payment;
  const neverPaid =
    !pay ||
    pay.status === "pending_checkout" ||
    pay.status === "cancelled" ||
    pay.stripePaymentIntentId.startsWith("pending_") ||
    pay.stripePaymentIntentId.startsWith("cs_");

  if (!neverPaid) {
    return NextResponse.json(
      { error: "This job was paid and refunded. Start a new post instead of restoring." },
      { status: 400 }
    );
  }

  await db.$transaction([
    db.job.update({
      where: { id: job.id },
      data: { status: "PENDING_PAYMENT" },
    }),
    ...(pay
      ? [
          db.payment.update({
            where: { id: pay.id },
            data: { status: "pending_checkout" },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ success: true, status: "PENDING_PAYMENT" });
}
