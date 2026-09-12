import { db } from "@/lib/db";
import { notifyJobThreeDaysLeft, notifyMusiciansJobCancelled } from "@/lib/notify";
import { stripe } from "@/lib/stripe";

// How long an OPEN job can sit past its deadline with no winner before the
// lazy sweep (see GET /api/jobs) auto-cancels it. Gives the creator a window
// to notice and act instead of an abrupt cancellation the instant time's up.
export const CANCEL_GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;

export const THREE_DAY_REMINDER_MS = 3 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Releases the escrowed PaymentIntent and marks the job cancelled. Used by
// both the creator-initiated cancel endpoint and the deadline sweep.
export async function cancelJobAndRefund(jobId: string) {
  const job = await db.job.findUnique({ where: { id: jobId }, include: { payment: true } });
  if (!job || job.status !== "OPEN") return;

  if (job.payment) {
    try {
      await stripe.paymentIntents.cancel(job.payment.stripePaymentIntentId);
    } catch (err) {
      // Already canceled/captured on Stripe's side - still sync our records.
      const code = (err as { code?: string })?.code;
      if (code !== "payment_intent_unexpected_state") throw err;
    }
  }

  await db.$transaction([
    db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } }),
    ...(job.payment
      ? [db.payment.update({ where: { id: job.payment.id }, data: { status: "cancelled" } })]
      : []),
  ]);

  await notifyMusiciansJobCancelled({ jobId: job.id, jobTitle: job.title });
}

/**
 * Find OPEN jobs showing ≤3 days left that have not had a reminder yet,
 * email matching musicians who have not submitted, and mark the job as reminded.
 * Returns how many jobs were processed.
 */
export async function sendDueThreeDayReminders(opts?: { jobId?: string }): Promise<number> {
  const { emailConfigured } = await import("@/lib/email");
  if (!emailConfigured()) return 0;

  const now = Date.now();
  const jobs = await db.job.findMany({
    where: {
      status: "OPEN",
      threeDayReminderSentAt: null,
      ...(opts?.jobId ? { id: opts.jobId } : {}),
    },
    select: {
      id: true,
      title: true,
      instrument: true,
      instrumentId: true,
      description: true,
      priceCents: true,
      deadline: true,
      creatorId: true,
    },
  });

  const due = jobs.filter((job) => {
    const remaining = new Date(job.deadline).getTime() - now;
    if (remaining <= 0) return false;
    // Match the "N days left" pill (floor). 3.09 days → 3 days left → remind.
    return Math.floor(remaining / DAY_MS) <= 3;
  });

  let sent = 0;
  for (const job of due) {
    try {
      const recipients = await notifyJobThreeDaysLeft(job);
      await db.job.update({
        where: { id: job.id },
        data: { threeDayReminderSentAt: new Date() },
      });
      console.log(`[three-day reminder] ${job.id} → ${recipients} recipients`);
      sent += 1;
    } catch (err) {
      console.error(`[three-day reminder] failed for ${job.id}`, err);
    }
  }
  return sent;
}
