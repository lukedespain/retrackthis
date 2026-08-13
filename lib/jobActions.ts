import { db } from "@/lib/db";
import { notifyMusiciansJobCancelled } from "@/lib/notify";
import { stripe } from "@/lib/stripe";

// How long an OPEN job can sit past its deadline with no winner before the
// lazy sweep (see GET /api/jobs) auto-cancels it. Gives the creator a window
// to notice and act instead of an abrupt cancellation the instant time's up.
export const CANCEL_GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;

// Releases the escrowed PaymentIntent and marks the job cancelled. Used by
// both the creator-initiated cancel endpoint and the deadline sweep.
export async function cancelJobAndRefund(jobId: string) {
  const job = await db.job.findUnique({ where: { id: jobId }, include: { payment: true } });
  if (!job || job.status !== "OPEN") return;

  if (job.payment) {
    try {
      await stripe.paymentIntents.cancel(job.payment.stripePaymentIntentId);
    } catch (err) {
      // Already canceled/captured on Stripe's side — still sync our records.
      const code = (err as { code?: string })?.code;
      if (code !== "payment_intent_unexpected_state") throw err;
    }
  }

  await db.$transaction([
    db.job.update({ where: { id: jobId }, data: { status: "CANCELLED" } }),
    ...(job.payment
      ? [db.payment.update({ where: { id: job.payment.id }, data: { status: "cancelled" } })]
      : []),
  ]);

  await notifyMusiciansJobCancelled({ jobId: job.id, jobTitle: job.title });
}
