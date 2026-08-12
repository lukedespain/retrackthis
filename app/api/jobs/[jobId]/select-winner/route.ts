import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe, calcPlatformFeeCents } from "@/lib/stripe";
import { assertMusicianPayoutsReady } from "@/lib/stripeConnect";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/jobs/:jobId/select-winner  { takeId }
// Captures the held payment, transfers the musician's cut to their
// connected Stripe account, marks the job awarded and the take as winner.
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { takeId } = await req.json();

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    include: { payment: true },
  });
  const take = await db.take.findUnique({
    where: { id: takeId },
    include: { musician: true },
  });

  if (!job || !job.payment || !take || take.jobId !== job.id) {
    return NextResponse.json({ error: "Job or take not found" }, { status: 404 });
  }
  if (job.creatorId !== sessionUserId) {
    return NextResponse.json({ error: "Not authorized to select a winner for this job" }, { status: 403 });
  }
  if (!take.musician.stripeAccountId) {
    return NextResponse.json({ error: "Musician hasn't finished Stripe onboarding" }, { status: 400 });
  }

  try {
    await assertMusicianPayoutsReady(take.musician.stripeAccountId);
  } catch {
    return NextResponse.json({ error: "Musician hasn't finished Stripe onboarding" }, { status: 400 });
  }

  // 1. Capture the held funds
  await stripe.paymentIntents.capture(job.payment.stripePaymentIntentId);

  // 2. Transfer musician's cut (price minus platform fee) to their connected account
  const platformFeeCents = calcPlatformFeeCents(job.payment.amountCents);
  const payoutCents = job.payment.amountCents - platformFeeCents;

  await stripe.transfers.create({
    amount: payoutCents,
    currency: "usd",
    destination: take.musician.stripeAccountId,
    transfer_group: job.id,
  });

  // 3. Update records
  await db.$transaction([
    db.take.update({ where: { id: take.id }, data: { isWinner: true } }),
    db.job.update({ where: { id: job.id }, data: { status: "AWARDED" } }),
    db.payment.update({
      where: { id: job.payment.id },
      data: { status: "transferred", platformFeeCents },
    }),
  ]);

  return NextResponse.json({ success: true });
}
