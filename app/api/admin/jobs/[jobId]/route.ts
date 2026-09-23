import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/**
 * Admin hard-delete: removes a job and its payment/takes from the DB.
 * Use for test junk. Does not call Stripe (refund/cancel money first if needed).
 * DELETE /api/admin/jobs/:jobId
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    include: {
      payment: { select: { id: true, status: true, amountCents: true } },
      _count: { select: { takes: true } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const takeIds = (
    await db.take.findMany({ where: { jobId: job.id }, select: { id: true } })
  ).map((t) => t.id);

  await db.$transaction([
    ...(takeIds.length
      ? [db.takeFile.deleteMany({ where: { takeId: { in: takeIds } } })]
      : []),
    db.take.deleteMany({ where: { jobId: job.id } }),
    db.payment.deleteMany({ where: { jobId: job.id } }),
    db.job.delete({ where: { id: job.id } }),
  ]);

  return NextResponse.json({
    success: true,
    deleted: {
      id: job.id,
      title: job.title,
      status: job.status,
      takeCount: job._count.takes,
      paymentStatus: job.payment?.status ?? null,
      amountCents: job.payment?.amountCents ?? null,
    },
  });
}
