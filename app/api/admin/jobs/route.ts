import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { calcPlatformFeeCents } from "@/lib/stripe";
import { formatPayoutProviderLabel } from "@/lib/connectCountries";

// GET /api/admin/jobs - open (+ recent) jobs for admin editing help
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const jobs = await db.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      creator: { select: { id: true, name: true, email: true } },
      payment: { select: { amountCents: true, status: true, platformFeeCents: true } },
      _count: { select: { takes: true } },
      takes: {
        where: { isWinner: true },
        take: 1,
        select: {
          id: true,
          musician: {
            select: {
              id: true,
              name: true,
              email: true,
              payoutProvider: true,
              payoutEmail: true,
              payoutAccountName: true,
              stripeAccountId: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    jobs: jobs.map(({ takes: winningTakes, ...job }) => {
      const winner = winningTakes[0]?.musician ?? null;
      const amountCents = job.payment?.amountCents ?? job.priceCents;
      const fee =
        job.payment?.platformFeeCents ?? calcPlatformFeeCents(amountCents);
      const payoutCents = amountCents - fee;
      const needsManualPayout = job.payment?.status === "pending_manual_payout";

      return {
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
        takeCount: job._count.takes,
        hasSelectedWinner: winningTakes.length > 0,
        needsManualPayout,
        winnerPayout: winner
          ? {
              musicianName: winner.name,
              musicianEmail: winner.email,
              provider: winner.payoutProvider,
              providerLabel: formatPayoutProviderLabel(winner.payoutProvider),
              payoutEmail: winner.payoutEmail,
              payoutAccountName: winner.payoutAccountName,
              payoutLabel: formatCents(payoutCents),
              payoutCents,
              hasStripe: Boolean(winner.stripeAccountId),
            }
          : null,
      };
    }),
  });
}
