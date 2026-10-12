import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public, aggregate-only marketplace stats for the Find Work page.
// No names, emails, or song titles. Test jobs are excluded everywhere.
export const revalidate = 600;

export async function GET() {
  const real = { isTest: false };

  const [openJobs, picked, cancelledJobs, takes, musicianProfiles, recent] = await Promise.all([
    db.job.count({ where: { ...real, status: "OPEN" } }),
    db.job.findMany({
      where: { ...real, status: "AWARDED" },
      select: { payment: { select: { status: true, amountCents: true, platformFeeCents: true } } },
    }),
    db.job.count({ where: { ...real, status: "CANCELLED" } }),
    db.takeFile.count({ where: { kind: "AUDIO", take: { job: real } } }),
    // Every account has both roles, so "musician" = someone who listed an instrument.
    db.user.findMany({ where: { NOT: { instruments: { isEmpty: true } } }, select: { instruments: true } }),
    db.job.findMany({
      where: { ...real, status: "AWARDED" },
      orderBy: [{ moneyClaimedAt: { sort: "desc", nulls: "last" } }, { deadline: "desc" }],
      take: 4,
      select: {
        instrument: true,
        moneyClaimedAt: true,
        deadline: true,
        payment: { select: { amountCents: true, platformFeeCents: true } },
      },
    }),
  ]);

  const net = (p: { amountCents: number; platformFeeCents: number } | null) =>
    p ? p.amountCents - p.platformFeeCents : 0;

  return NextResponse.json({
    openJobs,
    jobsPicked: picked.length,
    cancelledJobs,
    closedJobs: picked.length + cancelledJobs,
    takes,
    musicians: musicianProfiles.length,
    instrumentsCovered: new Set(musicianProfiles.flatMap((u) => u.instruments)).size,
    // What actually reached musicians: transferred payouts, after the platform fee.
    paidToMusiciansCents: picked
      .filter((j) => j.payment?.status === "transferred")
      .reduce((sum, j) => sum + net(j.payment), 0),
    recentPicks: recent.map((j) => ({
      instrument: j.instrument,
      payoutCents: net(j.payment),
      // Older jobs predate the pick timestamp; picks happen right after the deadline.
      pickedAt: j.moneyClaimedAt ?? j.deadline,
    })),
  });
}
