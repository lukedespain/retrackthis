import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/appUrl";
import { db } from "@/lib/db";
import { labelForInstrumentId } from "@/lib/instruments";
import { stripe } from "@/lib/stripe";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/jobs/:jobId/resume-checkout
// Returns an Embedded Checkout client secret for a PENDING_PAYMENT job.
export async function POST(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const creatorId = await getSessionUserId();
  if (!creatorId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    include: { payment: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.creatorId !== creatorId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (job.status !== "PENDING_PAYMENT" || !job.payment) {
    return NextResponse.json({ error: "This job is not awaiting payment" }, { status: 400 });
  }

  const sessionId = job.payment.stripeCheckoutSessionId;
  if (sessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(sessionId);
      if (existing.status === "complete" && existing.payment_status === "paid") {
        const { activateJobFromCheckout } = await import("@/lib/checkoutActivate");
        await activateJobFromCheckout(existing);
        return NextResponse.json({ status: "OPEN", activated: true });
      }
      if (existing.status === "open" && existing.client_secret) {
        return NextResponse.json({
          clientSecret: existing.client_secret,
          amountCents: job.payment.amountCents,
        });
      }
    } catch (err) {
      console.warn("[resume-checkout] retrieve", err);
    }
  }

  const base = appBaseUrl();
  const instrumentLabel = labelForInstrumentId(job.instrument) || job.instrument;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        ui_mode: "embedded",
        mode: "payment",
        return_url: `${base}/producers?posted=1&job=${job.id}&session_id={CHECKOUT_SESSION_ID}`,
        client_reference_id: job.id,
        metadata: {
          jobId: job.id,
          creatorId,
        },
        payment_intent_data: {
          metadata: {
            jobId: job.id,
            creatorId,
          },
        },
        custom_text: {
          submit: {
            message:
              "You're charged now. The musician is paid when you pick a winner. Cancel before that for a full refund.",
          },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: job.payment.amountCents,
              product_data: {
                name: `Retrack This: ${job.title}`.slice(0, 120),
                description: `${instrumentLabel} · paid upfront; musician is paid when you pick a winner`.slice(
                  0,
                  500
                ),
              },
            },
          },
        ],
      },
      { idempotencyKey: `job_checkout_resume_${job.id}_${sessionId ?? "none"}` }
    );

    if (!session.client_secret) {
      return NextResponse.json({ error: "Checkout did not return a client secret" }, { status: 502 });
    }

    await db.payment.update({
      where: { id: job.payment.id },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: `pending_${session.id}`,
      },
    });

    return NextResponse.json({
      clientSecret: session.client_secret,
      amountCents: job.payment.amountCents,
    });
  } catch (err) {
    console.error("[resume-checkout]", err);
    return NextResponse.json({ error: "Could not resume checkout" }, { status: 502 });
  }
}
