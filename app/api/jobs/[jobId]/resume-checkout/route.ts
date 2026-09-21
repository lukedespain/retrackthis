import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/jobs/:jobId/resume-checkout
// Returns the Stripe Checkout URL for a PENDING_PAYMENT job so the producer
// can finish paying after abandoning the first redirect.
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
  if (job.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "This job is not awaiting payment" }, { status: 400 });
  }

  const sessionId = job.payment?.stripeCheckoutSessionId;
  if (!sessionId) {
    return NextResponse.json({ error: "No checkout session on this job" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "complete" && session.payment_status === "paid") {
      const { activateJobFromCheckout } = await import("@/lib/checkoutActivate");
      await activateJobFromCheckout(session);
      return NextResponse.json({ status: "OPEN", activated: true });
    }
    if (session.status === "open" && session.url) {
      return NextResponse.json({ checkoutUrl: session.url });
    }
    return NextResponse.json(
      { error: "Checkout expired. Cancel this draft and post the job again." },
      { status: 410 }
    );
  } catch (err) {
    console.error("[resume-checkout]", err);
    return NextResponse.json({ error: "Could not resume checkout" }, { status: 502 });
  }
}
