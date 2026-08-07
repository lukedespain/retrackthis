import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Stripe webhook — handles events Stripe sends async (e.g. a Connect
// account finishing onboarding, a PaymentIntent failing, etc).
// Point your Stripe dashboard webhook at /api/webhooks/stripe.
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "account.updated":
      // TODO: when a musician's Connect account finishes onboarding,
      // save their stripeAccountId as "ready to receive payouts"
      break;
    case "payment_intent.payment_failed":
      // TODO: mark the related Job's payment as failed, notify creator
      break;
  }

  return NextResponse.json({ received: true });
}
