import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/**
 * Stripe webhook — async payment + Connect account events.
 * Dashboard endpoint: https://retrackthis.com/api/webhooks/stripe
 *
 * Capture / cancel / transfer still run in our API routes; this keeps DB
 * in sync when Stripe moves state outside those calls, and stores Connect
 * account ids when onboarding completes (metadata.userId set at create time).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.payment_failed":
        await syncPaymentFromIntent(event.data.object as Stripe.PaymentIntent, "failed");
        break;

      case "payment_intent.canceled":
        await syncPaymentFromIntent(event.data.object as Stripe.PaymentIntent, "cancelled");
        break;

      case "payment_intent.amount_capturable_updated":
        // Manual-capture authorize succeeded — funds held, not charged yet.
        await syncPaymentFromIntent(event.data.object as Stripe.PaymentIntent, "authorized", {
          onlyIfIn: ["authorized", "failed"],
        });
        break;

      case "payment_intent.succeeded":
        // Capture completed (or auto-capture). Don't downgrade past transferred.
        await syncPaymentFromIntent(event.data.object as Stripe.PaymentIntent, "captured", {
          onlyIfIn: ["authorized", "captured", "failed"],
        });
        break;

      case "account.updated":
        await handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        // Acknowledge unknown events so Stripe doesn't retry forever.
        console.log(`[stripe webhook] ignored event type: ${event.type}`);
        break;
    }
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function syncPaymentFromIntent(
  pi: Stripe.PaymentIntent,
  nextStatus: string,
  opts?: { onlyIfIn?: string[] }
) {
  const payment = await db.payment.findFirst({
    where: { stripePaymentIntentId: pi.id },
  });
  if (!payment) {
    console.warn(`[stripe webhook] no Payment row for PI ${pi.id}`);
    return;
  }

  if (opts?.onlyIfIn && !opts.onlyIfIn.includes(payment.status)) {
    return;
  }

  // Never overwrite a terminal transferred state with an earlier status.
  if (payment.status === "transferred" && nextStatus !== "transferred") {
    return;
  }

  if (payment.status === nextStatus) return;

  await db.payment.update({
    where: { id: payment.id },
    data: { status: nextStatus },
  });
}

/**
 * When Connect onboarding progresses, metadata.userId (our User.id / Supabase
 * auth id) must be set on the Account at creation. We store the account id
 * (and keep it in sync) so musicians can resume onboarding and receive transfers.
 */
async function handleConnectAccountUpdated(account: Stripe.Account) {
  const userId = account.metadata?.userId;
  if (!userId) {
    console.warn(`[stripe webhook] account.updated ${account.id} missing metadata.userId`);
    return;
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.warn(`[stripe webhook] no User for metadata.userId=${userId}`);
    return;
  }

  if (user.stripeAccountId === account.id) return;

  await db.user.update({
    where: { id: userId },
    data: { stripeAccountId: account.id },
  });
}
