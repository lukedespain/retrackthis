import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { activateJobFromCheckout, abandonUnpaidCheckout } from "@/lib/checkoutActivate";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/**
 * Stripe webhook - async payment + Connect account events.
 * Dashboard endpoint: https://retrackthis.com/api/webhooks/stripe
 *
 * Also completes charge-upfront Checkout sessions (opens PENDING_PAYMENT jobs).
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
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment" && session.payment_status === "paid") {
          await activateJobFromCheckout(session);
        }
        break;
      }

      case "checkout.session.expired": {
        await abandonUnpaidCheckout(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case "payment_intent.payment_failed":
        await syncPaymentFromIntent(event.data.object as Stripe.PaymentIntent, "failed");
        break;

      case "payment_intent.canceled":
        await syncPaymentFromIntent(event.data.object as Stripe.PaymentIntent, "cancelled", {
          onlyIfIn: ["authorized", "pending_checkout", "failed"],
        });
        break;

      case "payment_intent.amount_capturable_updated":
        await syncPaymentFromIntent(event.data.object as Stripe.PaymentIntent, "authorized", {
          onlyIfIn: ["authorized", "failed"],
        });
        break;

      case "payment_intent.succeeded":
        await syncPaymentFromIntent(event.data.object as Stripe.PaymentIntent, "captured", {
          onlyIfIn: ["authorized", "captured", "failed", "pending_checkout"],
        });
        break;

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const piId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (piId) {
          await syncPaymentFromIntent({ id: piId } as Stripe.PaymentIntent, "refunded", {
            onlyIfIn: ["captured", "transferred", "authorized", "pending_manual_payout"],
          });
        }
        break;
      }

      case "account.updated":
        await handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
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
  pi: { id: string },
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

  if (payment.status === "transferred" && nextStatus !== "transferred" && nextStatus !== "refunded") {
    return;
  }

  if (payment.status === nextStatus) return;

  await db.payment.update({
    where: { id: payment.id },
    data: { status: nextStatus },
  });
}

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

  if (user.stripeAccountId) {
    if (user.stripeAccountId !== account.id) {
      console.warn(
        `[stripe webhook] user ${userId} already has stripeAccountId=${user.stripeAccountId}; ignoring ${account.id}`
      );
    }
    return;
  }

  await db.user.update({
    where: { id: userId },
    data: { stripeAccountId: account.id },
  });
}
