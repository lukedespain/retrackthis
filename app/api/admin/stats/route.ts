import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

type Period = "7d" | "30d" | "90d" | "all";

function periodStart(period: Period): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function parsePeriod(raw: string | null): Period {
  if (raw === "7d" || raw === "30d" || raw === "90d" || raw === "all") return raw;
  return "30d";
}

// GET /api/admin/stats?period=7d|30d|90d|all
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const period = parsePeriod(req.nextUrl.searchParams.get("period"));
  const since = periodStart(period);
  const createdFilter = since ? { gte: since } : undefined;

  const [
    payments,
    jobsTotal,
    jobsOpen,
    jobsAwarded,
    jobsCancelled,
    takesTotal,
    membersTotal,
    membersNew,
  ] = await Promise.all([
    db.payment.findMany({
      where: {
        job: { isTest: false },
        ...(createdFilter ? { createdAt: createdFilter } : {}),
      },
      select: {
        amountCents: true,
        platformFeeCents: true,
        status: true,
        createdAt: true,
        job: {
          select: {
            id: true,
            title: true,
            instrument: true,
            status: true,
            creatorId: true,
            creator: { select: { name: true } },
          },
        },
      },
    }),
    db.job.count({
      where: { isTest: false, ...(createdFilter ? { createdAt: createdFilter } : {}) },
    }),
    db.job.count({
      where: {
        status: "OPEN",
        isTest: false,
        ...(createdFilter ? { createdAt: createdFilter } : {}),
      },
    }),
    db.job.count({
      where: {
        status: "AWARDED",
        isTest: false,
        ...(createdFilter ? { createdAt: createdFilter } : {}),
      },
    }),
    db.job.count({
      where: {
        status: "CANCELLED",
        isTest: false,
        ...(createdFilter ? { createdAt: createdFilter } : {}),
      },
    }),
    db.take.count({
      where: {
        job: { isTest: false },
        ...(createdFilter ? { submittedAt: createdFilter } : {}),
      },
    }),
    db.user.count(),
    db.user.count({ where: createdFilter ? { createdAt: createdFilter } : undefined }),
  ]);

  // Money on the platform for jobs still open (not yet awarded / paid out).
  let fundsHeldCents = 0;
  // Awarded volume (paid out or waiting on manual PayPal/Wise) - not open jobs.
  let volumeCapturedCents = 0;
  let platformFeeEarnedCents = 0;
  let cancelledCents = 0;
  let failedCents = 0;
  let transferredCents = 0;

  for (const p of payments) {
    const jobStatus = p.job.status;
    const openish = jobStatus === "OPEN" || jobStatus === "AWARDING";

    if (p.status === "captured" && openish) {
      fundsHeldCents += p.amountCents;
    }
    // Legacy manual-capture holds still open
    if (p.status === "authorized" && openish) {
      fundsHeldCents += p.amountCents;
    }

    if (p.status === "transferred" || p.status === "pending_manual_payout") {
      volumeCapturedCents += p.amountCents;
      platformFeeEarnedCents += p.platformFeeCents;
    }
    // Awarded but Stripe transfer not finished yet (rare captured+AWARDED)
    if (p.status === "captured" && jobStatus === "AWARDED") {
      volumeCapturedCents += p.amountCents;
      platformFeeEarnedCents += p.platformFeeCents;
    }

    if (p.status === "transferred") transferredCents += p.amountCents;
    if (p.status === "cancelled" || p.status === "refunded") cancelledCents += p.amountCents;
    if (p.status === "failed") failedCents += p.amountCents;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const seriesStart = since ?? (payments.length
    ? new Date(Math.min(...payments.map((p) => p.createdAt.getTime())))
    : new Date(Date.now() - 30 * dayMs));
  const seriesDays = Math.max(
    1,
    Math.ceil((Date.now() - seriesStart.getTime()) / dayMs) + 1
  );
  const byDay: Array<{
    date: string;
    amountCents: number;
    feesCents: number;
    count: number;
    jobs: Array<{
      id: string;
      title: string;
      instrument: string;
      status: string;
      amountCents: number;
      creatorId: string;
      creatorName: string;
    }>;
  }> = [];
  for (let i = 0; i < seriesDays; i++) {
    const d = new Date(seriesStart.getTime() + i * dayMs);
    const key = d.toISOString().slice(0, 10);
    byDay.push({ date: key, amountCents: 0, feesCents: 0, count: 0, jobs: [] });
  }
  const dayIndex = new Map(byDay.map((d, i) => [d.date, i]));
  for (const p of payments) {
    if (p.status === "cancelled" || p.status === "refunded" || p.status === "failed") continue;
    // Chart = settled awarded volume only (not open holds)
    if (p.status !== "transferred" && p.status !== "pending_manual_payout") {
      if (!(p.status === "captured" && p.job.status === "AWARDED")) continue;
    }
    const key = p.createdAt.toISOString().slice(0, 10);
    const idx = dayIndex.get(key);
    if (idx == null) continue;
    byDay[idx].amountCents += p.amountCents;
    byDay[idx].feesCents += p.platformFeeCents;
    byDay[idx].count += 1;
    byDay[idx].jobs.push({
      id: p.job.id,
      title: p.job.title,
      instrument: p.job.instrument,
      status: p.job.status,
      amountCents: p.amountCents,
      creatorId: p.job.creatorId,
      creatorName: p.job.creator.name,
    });
  }

  return NextResponse.json({
    period,
    since: since?.toISOString() ?? null,
    income: {
      fundsHeldCents,
      // Keep old key for a moment so a stale client doesn't blank - prefer fundsHeldCents
      escrowAuthorizedCents: fundsHeldCents,
      volumeCapturedCents,
      platformFeeEarnedCents,
      transferredCents,
      cancelledCents,
      failedCents,
      paymentCount: payments.length,
    },
    activity: {
      jobsTotal,
      jobsOpen,
      jobsAwarded,
      jobsCancelled,
      takesTotal,
      membersTotal,
      membersNew,
    },
    series: byDay,
  });
}
