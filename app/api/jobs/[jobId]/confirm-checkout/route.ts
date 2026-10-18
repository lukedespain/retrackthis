import { NextRequest, NextResponse } from "next/server";
import { activateJobFromCheckout } from "@/lib/checkoutActivate";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/jobs/:jobId/confirm-checkout
// Success-URL fallback when the webhook is slow: pull the Checkout session
// and open the job if payment already succeeded.
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
  if (job.status === "OPEN" || job.status === "AWARDED") {
    return NextResponse.json({ status: job.status, activated: false, ...(await checkoutSummary(job.payment?.stripeCheckoutSessionId)) });
  }
  if (job.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "Job is not awaiting payment" }, { status: 400 });
  }

  const sessionId = job.payment?.stripeCheckoutSessionId;
  if (!sessionId) {
    return NextResponse.json({ error: "No checkout session" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      await activateJobFromCheckout(session);
      return NextResponse.json({ status: "OPEN", activated: true, ...(await checkoutSummary(session.id)) });
    }
    return NextResponse.json({ status: "PENDING_PAYMENT", activated: false });
  } catch (err) {
    console.error("[confirm-checkout]", err);
    return NextResponse.json({ error: "Could not confirm payment" }, { status: 502 });
  }
}

/** For the browser Purchase event: one checkout can pay for several parts. */
async function checkoutSummary(checkoutId: string | null | undefined) {
  if (!checkoutId) return {};
  const payments = await db.payment.findMany({
    where: { stripeCheckoutSessionId: checkoutId },
    select: { jobId: true, amountCents: true },
  });
  return {
    checkoutId,
    amount: payments.reduce((sum, p) => sum + p.amountCents, 0) / 100,
    jobIds: payments.map((p) => p.jobId),
  };
}
