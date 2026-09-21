import { db } from "@/lib/db";
import { notifyJobInvites, notifyNewJobPosted } from "@/lib/notify";
import type Stripe from "stripe";

/**
 * After Checkout succeeds: attach the PaymentIntent, open the job, notify musicians.
 */
export async function activateJobFromCheckout(session: Stripe.Checkout.Session) {
  const jobId = session.metadata?.jobId ?? session.client_reference_id;
  if (!jobId) {
    console.warn("[checkout] session missing jobId", session.id);
    return;
  }

  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { payment: true },
  });
  if (!job) {
    console.warn("[checkout] no job for", jobId);
    return;
  }
  if (job.status === "OPEN" || job.status === "AWARDED") {
    return;
  }
  if (job.status !== "PENDING_PAYMENT") {
    console.warn("[checkout] unexpected job status", job.status, jobId);
    return;
  }

  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!piId) {
    console.warn("[checkout] session has no payment_intent", session.id);
    return;
  }

  if (!job.payment) {
    await db.payment.create({
      data: {
        jobId: job.id,
        stripePaymentIntentId: piId,
        stripeCheckoutSessionId: session.id,
        amountCents: job.priceCents,
        platformFeeCents: 0,
        status: "captured",
      },
    });
  } else {
    await db.payment.update({
      where: { id: job.payment.id },
      data: {
        stripePaymentIntentId: piId,
        stripeCheckoutSessionId: session.id,
        status: "captured",
        amountCents: job.priceCents,
      },
    });
  }

  const opened = await db.job.update({
    where: { id: job.id },
    data: { status: "OPEN" },
  });

  await notifyNewJobPosted(opened);

  const inviteRaw = session.metadata?.inviteEmails?.trim();
  if (inviteRaw) {
    const emails = inviteRaw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length > 0) {
      const creator = await db.user.findUnique({
        where: { id: job.creatorId },
        select: { name: true },
      });
      await notifyJobInvites({
        job: opened,
        creatorName: creator?.name ?? "A creator",
        emails,
      });
    }
  }
}

/**
 * Checkout expired without pay. Keep the job as Draft (PENDING_PAYMENT) so the
 * producer can finish later. Explicit "Discard draft" is what cancels it.
 */
export async function abandonUnpaidCheckout(session: Stripe.Checkout.Session) {
  const jobId = session.metadata?.jobId ?? session.client_reference_id;
  if (!jobId) return;
  console.log("[checkout] session expired; draft kept", jobId, session.id);
}
