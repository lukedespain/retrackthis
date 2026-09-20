import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireAdmin } from "@/lib/admin";
import { isAltPayoutProvider } from "@/lib/connectCountries";
import { db } from "@/lib/db";
import { calcPlatformFeeCents, stripe } from "@/lib/stripe";

function chargeIdFromIntent(pi: Stripe.PaymentIntent): string | null {
  const latest = pi.latest_charge;
  if (typeof latest === "string" && latest.startsWith("ch_")) return latest;
  if (latest && typeof latest === "object" && "id" in latest) return latest.id;
  return null;
}

/**
 * Admin: finish musician payout for an AWARDED job whose payment is captured
 * but not yet transferred (e.g. Payment Link recovery).
 * POST /api/admin/jobs/:jobId/complete-payout
 * Body optional: { markOnly?: boolean } — skip Stripe transfer (already done in Dashboard).
 */
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const markOnly = Boolean(body?.markOnly);

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    include: {
      payment: true,
      takes: {
        where: { isWinner: true },
        take: 1,
        include: { musician: true },
      },
    },
  });

  if (!job?.payment) {
    return NextResponse.json({ error: "Job or payment not found" }, { status: 404 });
  }
  if (job.status !== "AWARDED") {
    return NextResponse.json({ error: "Job must be awarded first" }, { status: 400 });
  }
  if (job.payment.status === "transferred") {
    return NextResponse.json({ success: true, alreadyTransferred: true });
  }
  if (job.payment.status === "pending_manual_payout") {
    return NextResponse.json({ success: true, alreadyManual: true });
  }
  if (job.payment.status !== "captured") {
    return NextResponse.json(
      { error: `Payment status is ${job.payment.status}; expected captured` },
      { status: 400 }
    );
  }

  const take = job.takes[0];
  if (!take) {
    return NextResponse.json({ error: "No winning take on this job" }, { status: 400 });
  }

  const musician = take.musician;
  const platformFeeCents = calcPlatformFeeCents(job.payment.amountCents);
  const payoutCents = job.payment.amountCents - platformFeeCents;
  if (payoutCents < 1) {
    return NextResponse.json({ error: "Payout too small after fee" }, { status: 400 });
  }

  if (markOnly) {
    await db.payment.update({
      where: { id: job.payment.id },
      data: { status: "transferred", platformFeeCents },
    });
    return NextResponse.json({
      success: true,
      payout: "marked",
      payoutCents,
      platformFeeCents,
    });
  }

  const altPayout =
    isAltPayoutProvider(musician.payoutProvider) &&
    Boolean(musician.payoutEmail?.trim()) &&
    Boolean(musician.payoutAccountName?.trim());

  if (altPayout) {
    await db.payment.update({
      where: { id: job.payment.id },
      data: { status: "pending_manual_payout", platformFeeCents },
    });
    return NextResponse.json({
      success: true,
      payout: "manual",
      provider: musician.payoutProvider,
    });
  }

  if (!musician.stripeAccountId) {
    return NextResponse.json({ error: "Musician has no Stripe Connect account" }, { status: 400 });
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(job.payment.stripePaymentIntentId);
    if (pi.status !== "succeeded") {
      return NextResponse.json(
        { error: `PaymentIntent status is ${pi.status}, expected succeeded` },
        { status: 402 }
      );
    }

    const prior = await stripe.transfers.list({ transfer_group: job.id, limit: 1 });
    if (prior.data.length === 0) {
      const chargeId = chargeIdFromIntent(pi);
      await stripe.transfers.create({
        amount: payoutCents,
        currency: "usd",
        destination: musician.stripeAccountId,
        transfer_group: job.id,
        ...(chargeId ? { source_transaction: chargeId } : {}),
        metadata: { jobId: job.id, adminCompletePayout: "true" },
      });
    }

    await db.payment.update({
      where: { id: job.payment.id },
      data: { status: "transferred", platformFeeCents },
    });

    return NextResponse.json({
      success: true,
      payout: "stripe",
      payoutCents,
      platformFeeCents,
    });
  } catch (err) {
    console.error("[admin complete-payout]", err);
    const raw = err instanceof Error ? err.message : "Transfer failed";
    const hint =
      /No such payment_intent/i.test(raw)
        ? `${raw} — Vercel’s STRIPE_SECRET_KEY likely doesn’t match the mode this charge was made in (Live vs Test). Transfer $90 in the Live Stripe Dashboard to the musician Connect account, then use “Mark transferred”.`
        : raw;
    return NextResponse.json({ error: hint }, { status: 502 });
  }
}
