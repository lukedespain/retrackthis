import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";

// GET /api/admin/jobs — open (+ recent) jobs for admin editing help
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const jobs = await db.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      creator: { select: { id: true, name: true, email: true } },
      payment: { select: { amountCents: true, status: true } },
    },
  });

  return NextResponse.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      creatorId: job.creatorId,
      title: job.title,
      instrument: job.instrument,
      instrumentId: job.instrumentId,
      description: job.description,
      demoFileUrl: job.demoFileUrl,
      backingFileUrl: job.backingFileUrl,
      priceCents: job.priceCents,
      priceLabel: formatCents(job.priceCents),
      bpm: job.bpm,
      deadline: job.deadline.toISOString(),
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      creator: job.creator,
      paymentStatus: job.payment?.status ?? null,
      missingBacking: !job.backingFileUrl,
      flexibleTempo: job.bpm == null,
    })),
  });
}
