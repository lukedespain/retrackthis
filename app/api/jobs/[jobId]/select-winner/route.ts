import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe, calcPlatformFeeCents } from "@/lib/stripe";
import { assertMusicianPayoutsReady } from "@/lib/stripeConnect";
import { notifyMusicianAwarded } from "@/lib/notify";
import { getSessionUserId } from "@/lib/supabaseServer";

function stripeMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return err instanceof Error ? err.message : "Something went wrong awarding this take";
}

function chargeIdFromIntent(pi: Stripe.PaymentIntent): string | null {
  const latest = pi.latest_charge;
  if (typeof latest === "string" && latest.startsWith("ch_")) return latest;
  if (latest && typeof latest === "object" && "id" in latest) return latest.id;
  const legacy = (pi as Stripe.PaymentIntent & { charges?: { data?: Array<{ id: string }> } }).charges
    ?.data?.[0]?.id;
  return legacy ?? null;
}

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
  if (job.status === "AWARDED") {
    return NextResponse.json({ success: true, alreadyAwarded: true });
  }
  if (job.status !== "OPEN") {
    return NextResponse.json({ error: "Only open jobs can be awarded" }, { status: 400 });
  }
  if (!take.musician.stripeAccountId) {
    return NextResponse.json({ error: "Musician hasn't finished Stripe onboarding" }, { status: 400 });
  }

  try {
    await assertMusicianPayoutsReady(take.musician.stripeAccountId);
  } catch {
    return NextResponse.json({ error: "Musician hasn't finished Stripe onboarding" }, { status: 400 });
  }

  const platformFeeCents = calcPlatformFeeCents(job.payment.amountCents);
  const payoutCents = job.payment.amountCents - platformFeeCents;
  if (payoutCents < 1) {
    return NextResponse.json({ error: "Payout amount is too small after platform fee" }, { status: 400 });
  }

  try {
    // 1. Capture held funds (or reuse if a previous attempt already captured)
    let paymentIntent = await stripe.paymentIntents.retrieve(job.payment.stripePaymentIntentId);
    if (paymentIntent.status === "requires_capture") {
      paymentIntent = await stripe.paymentIntents.capture(job.payment.stripePaymentIntentId);
    } else if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment can’t be captured (status: ${paymentIntent.status})` },
        { status: 402 }
      );
    }

    const chargeId = chargeIdFromIntent(paymentIntent);
    if (!chargeId) {
      return NextResponse.json(
        { error: "Payment captured but no charge id was returned. Try again in a moment." },
        { status: 502 }
      );
    }

    // 2. Transfer musician's cut, tied to this charge so it works before
    // platform available balance settles (required in live mode).
    await stripe.transfers.create({
      amount: payoutCents,
      currency: "usd",
      destination: take.musician.stripeAccountId,
      transfer_group: job.id,
      source_transaction: chargeId,
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

    await notifyMusicianAwarded({ musicianId: take.musicianId, jobTitle: job.title });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[select-winner]", err);
    return NextResponse.json({ error: stripeMessage(err) }, { status: 502 });
  }
}
