import type Stripe from "stripe";
import { isAltPayoutProvider } from "@/lib/connectCountries";
import { db } from "@/lib/db";
import {
  notifyJobThreeDaysLeft,
  notifyMusicianAwarded,
  notifyMusiciansJobCancelled,
  notifyProducerDeadlineReached,
} from "@/lib/notify";
import { calcPlatformFeeCents, stripe } from "@/lib/stripe";
import { assertMusicianPayoutsReady } from "@/lib/stripeConnect";

// How long an OPEN job can sit past its deadline with no favorite before the
// cron sweep auto-cancels and refunds.
export const CANCEL_GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;

// After the deadline, producers have this window to award a submission
// (or switch favorites). Cron auto-awards a saved favorite when it expires.
export const FINALIZE_GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;

// Stripe manual-capture authorizations typically expire ~7 days after creation.
// Finalize (or cancel) before then so escrow doesn't silently vanish.
export const AUTH_HOLD_SAFE_MS = 6 * 24 * 60 * 60 * 1000;

export const THREE_DAY_REMINDER_MS = 3 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Latest moment we should auto-finalize a picked job.
 * Escrow (authorized hold): grace capped by ~day-6 hold life.
 * Charge-upfront (already captured): deadline + grace only.
 */
export function finalizeAutoAt(
  deadline: Date,
  paymentCreatedAt: Date,
  opts?: { escrowHold?: boolean }
): Date {
  const afterGrace = deadline.getTime() + FINALIZE_GRACE_PERIOD_MS;
  if (!opts?.escrowHold) {
    return new Date(afterGrace);
  }
  const beforeHoldDies = paymentCreatedAt.getTime() + AUTH_HOLD_SAFE_MS;
  return new Date(Math.min(afterGrace, beforeHoldDies));
}

function chargeIdFromIntent(pi: Stripe.PaymentIntent): string | null {
  const latest = pi.latest_charge;
  if (typeof latest === "string" && latest.startsWith("ch_")) return latest;
  if (latest && typeof latest === "object" && "id" in latest) return latest.id;
  const legacy = (pi as Stripe.PaymentIntent & { charges?: { data?: Array<{ id: string }> } }).charges
    ?.data?.[0]?.id;
  return legacy ?? null;
}

export type FinalizeAwardResult =
  | {
      ok: true;
      payout: "stripe" | "manual";
      provider?: string | null;
      payoutEmail?: string | null;
      payoutAccountName?: string | null;
    }
  | { ok: false; error: string; status: number };

const AWARD_RETRY_MS = 30_000;

/**
 * One award at a time. OPEN → AWARDING wins the race.
 * A stuck AWARDING row can be resumed after 30s (crash between claim and DB write).
 */
async function claimJobForAward(jobId: string): Promise<"ok" | "busy" | "closed"> {
  const fresh = await db.job.updateMany({
    where: { id: jobId, status: "OPEN" },
    data: { status: "AWARDING", moneyClaimedAt: new Date() },
  });
  if (fresh.count === 1) return "ok";

  const job = await db.job.findUnique({ where: { id: jobId }, select: { status: true } });
  if (!job || job.status === "AWARDED" || job.status === "CANCELLED" || job.status === "CANCELLING") {
    return "closed";
  }
  if (job.status !== "AWARDING") return "closed";

  const resume = await db.job.updateMany({
    where: {
      id: jobId,
      status: "AWARDING",
      OR: [
        { moneyClaimedAt: null },
        { moneyClaimedAt: { lt: new Date(Date.now() - AWARD_RETRY_MS) } },
      ],
    },
    data: { moneyClaimedAt: new Date() },
  });
  return resume.count === 1 ? "ok" : "busy";
}

/**
 * Capture escrow, pay the winning musician, mark the job AWARDED.
 * Used when the producer selects after the deadline, or by the deadline sweep
 * when a provisional selection is already set.
 */
export async function finalizeAward(jobId: string, takeId?: string): Promise<FinalizeAwardResult> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { payment: true },
  });
  if (!job || !job.payment) {
    return { ok: false, error: "Job or payment not found", status: 404 };
  }
  if (job.status === "AWARDED") {
    return { ok: true, payout: "stripe" };
  }

  const take = takeId
    ? await db.take.findUnique({ where: { id: takeId }, include: { musician: true } })
    : await db.take.findFirst({
        where: { jobId, isWinner: true },
        include: { musician: true },
      });

  if (!take || take.jobId !== job.id) {
    return { ok: false, error: "Winning take not found", status: 404 };
  }
  if (take.musicianId === job.creatorId) {
    return { ok: false, error: "You can’t award your own take on your own job", status: 400 };
  }

  const musician = take.musician;
  const altPayout =
    isAltPayoutProvider(musician.payoutProvider) &&
    Boolean(musician.payoutEmail?.trim()) &&
    Boolean(musician.payoutAccountName?.trim());

  if (!altPayout) {
    if (!musician.stripeAccountId) {
      return { ok: false, error: "Musician hasn't finished payout setup", status: 400 };
    }
    try {
      await assertMusicianPayoutsReady(musician.stripeAccountId);
    } catch {
      return { ok: false, error: "Musician hasn't finished payout setup", status: 400 };
    }
  }

  const platformFeeCents = calcPlatformFeeCents(job.payment.amountCents);
  const payoutCents = job.payment.amountCents - platformFeeCents;
  if (payoutCents < 1) {
    return { ok: false, error: "Payout amount is too small after platform fee", status: 400 };
  }

  const claim = await claimJobForAward(job.id);
  if (claim === "busy") {
    return {
      ok: false,
      error: "Payment is already in progress. Refresh in a moment and try again if it didn’t finish.",
      status: 409,
    };
  }
  if (claim === "closed") {
    return { ok: false, error: "Only open jobs can be awarded", status: 400 };
  }

  let paymentIntent = await stripe.paymentIntents.retrieve(job.payment.stripePaymentIntentId);
  if (paymentIntent.status === "canceled" || job.payment.status === "cancelled") {
    // Escrow already gone — don't leave an OPEN job with a provisional winner stuck forever.
    await db.$transaction([
      db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } }),
      db.payment.update({
        where: { id: job.payment.id },
        data: { status: "cancelled" },
      }),
      db.take.updateMany({ where: { jobId: job.id, isWinner: true }, data: { isWinner: false } }),
    ]);
    await notifyMusiciansJobCancelled({ jobId: job.id, jobTitle: job.title });
    return {
      ok: false,
      error: "Payment was cancelled, so this job was closed without an award",
      status: 402,
    };
  }
  if (paymentIntent.status === "requires_capture") {
    paymentIntent = await stripe.paymentIntents.capture(
      job.payment.stripePaymentIntentId,
      {},
      { idempotencyKey: `job_capture_${job.id}` }
    );
  } else if (paymentIntent.status !== "succeeded") {
    await db.job.updateMany({
      where: { id: job.id, status: "AWARDING" },
      data: { status: "OPEN" },
    });
    return {
      ok: false,
      error: `Payment can’t be captured (status: ${paymentIntent.status})`,
      status: 402,
    };
  }

  // Already finalized on a prior attempt (sweep retry / concurrent request).
  if (
    job.payment.status === "transferred" ||
    job.payment.status === "pending_manual_payout"
  ) {
    await db.$transaction([
      db.take.updateMany({ where: { jobId: job.id, isWinner: true }, data: { isWinner: false } }),
      db.take.update({ where: { id: take.id }, data: { isWinner: true } }),
      db.job.update({ where: { id: job.id }, data: { status: "AWARDED" } }),
    ]);
    return {
      ok: true,
      payout: job.payment.status === "pending_manual_payout" ? "manual" : "stripe",
      provider: musician.payoutProvider,
      payoutEmail: musician.payoutEmail,
      payoutAccountName: musician.payoutAccountName,
    };
  }

  if (altPayout) {
    await db.$transaction([
      db.take.updateMany({ where: { jobId: job.id, isWinner: true }, data: { isWinner: false } }),
      db.take.update({ where: { id: take.id }, data: { isWinner: true } }),
      db.job.update({ where: { id: job.id }, data: { status: "AWARDED" } }),
      db.payment.update({
        where: { id: job.payment.id },
        data: { status: "pending_manual_payout", platformFeeCents },
      }),
    ]);

    await notifyMusicianAwarded({
      musicianId: take.musicianId,
      jobTitle: job.title,
      payoutProvider: musician.payoutProvider ?? undefined,
    });

    return {
      ok: true,
      payout: "manual",
      provider: musician.payoutProvider,
      payoutEmail: musician.payoutEmail,
      payoutAccountName: musician.payoutAccountName,
    };
  }

  const chargeId = chargeIdFromIntent(paymentIntent);
  if (!chargeId) {
    return {
      ok: false,
      error: "Payment captured but no charge id was returned. Try again in a moment.",
      status: 502,
    };
  }

  // Avoid double-paying if a previous finalize captured + transferred but failed to update DB.
  const prior = await stripe.transfers.list({ transfer_group: job.id, limit: 1 });
  if (prior.data.length === 0) {
    await stripe.transfers.create(
      {
        amount: payoutCents,
        currency: "usd",
        destination: musician.stripeAccountId!,
        transfer_group: job.id,
        source_transaction: chargeId,
      },
      { idempotencyKey: `job_transfer_${job.id}` }
    );
  }

  await db.$transaction([
    db.take.updateMany({ where: { jobId: job.id, isWinner: true }, data: { isWinner: false } }),
    db.take.update({ where: { id: take.id }, data: { isWinner: true } }),
    db.job.update({ where: { id: job.id }, data: { status: "AWARDED" } }),
    db.payment.update({
      where: { id: job.payment.id },
      data: { status: "transferred", platformFeeCents },
    }),
  ]);

  await notifyMusicianAwarded({
    musicianId: take.musicianId,
    jobTitle: job.title,
    payoutProvider: "stripe",
  });

  return { ok: true, payout: "stripe" };
}

/**
 * Mark a take as the provisional winner without capturing payment.
 * Job stays OPEN for more submissions until the deadline.
 */
export async function selectProvisionalWinner(jobId: string, takeId: string): Promise<FinalizeAwardResult> {
  const job = await db.job.findUnique({ where: { id: jobId } });
  const take = await db.take.findUnique({
    where: { id: takeId },
    include: { musician: true },
  });

  if (!job || !take || take.jobId !== job.id) {
    return { ok: false, error: "Job or take not found", status: 404 };
  }
  if (job.status !== "OPEN") {
    return { ok: false, error: "Only open jobs can be awarded", status: 400 };
  }
  if (take.musicianId === job.creatorId) {
    return { ok: false, error: "You can’t award your own take on your own job", status: 400 };
  }

  const musician = take.musician;
  const altPayout =
    isAltPayoutProvider(musician.payoutProvider) &&
    Boolean(musician.payoutEmail?.trim()) &&
    Boolean(musician.payoutAccountName?.trim());

  if (!altPayout) {
    if (!musician.stripeAccountId) {
      return { ok: false, error: "Musician hasn't finished payout setup", status: 400 };
    }
    try {
      await assertMusicianPayoutsReady(musician.stripeAccountId);
    } catch {
      return { ok: false, error: "Musician hasn't finished payout setup", status: 400 };
    }
  }

  await db.$transaction([
    db.take.updateMany({ where: { jobId, isWinner: true }, data: { isWinner: false } }),
    db.take.update({ where: { id: takeId }, data: { isWinner: true } }),
  ]);

  return { ok: true, payout: "stripe" };
}

/**
 * Finalize OPEN jobs that already have a provisional winner once either:
 * - deadline + finalize grace has passed, or
 * - the card authorization is about to expire (~day 6 of the hold).
 * Producers award only after the deadline (no early close). Cron auto-awards
 * a saved favorite after the 48h grace window.
 */
export async function finalizeDueAwards(): Promise<number> {
  const now = Date.now();
  const candidates = await db.job.findMany({
    where: {
      status: "OPEN",
      takes: { some: { isWinner: true } },
      payment: { isNot: null },
    },
    select: {
      id: true,
      deadline: true,
      payment: { select: { createdAt: true, status: true } },
    },
  });

  const due = candidates.filter((job) => {
    if (!job.payment) return false;
    const escrowHold = job.payment.status === "authorized";
    return finalizeAutoAt(job.deadline, job.payment.createdAt, { escrowHold }).getTime() <= now;
  });

  let done = 0;
  for (const job of due) {
    try {
      const result = await finalizeAward(job.id);
      if (result.ok) {
        done += 1;
        console.log(`[award sweep] finalized ${job.id}`);
      } else {
        console.error(`[award sweep] ${job.id}: ${result.error}`);
      }
    } catch (err) {
      console.error(`[award sweep] failed for ${job.id}`, err);
    }
  }
  return done;
}

/**
 * Email producers once when the deadline hits (48h award window).
 * Includes jobs with or without a favorite.
 */
export async function sendDueFinalizeReminders(): Promise<number> {
  const { emailConfigured } = await import("@/lib/email");
  if (!emailConfigured()) return 0;

  const now = Date.now();
  const jobs = await db.job.findMany({
    where: {
      status: "OPEN",
      finalizeReminderSentAt: null,
      deadline: { lte: new Date(now) },
      payment: { isNot: null },
    },
    select: {
      id: true,
      title: true,
      deadline: true,
      creatorId: true,
      payment: { select: { createdAt: true, status: true } },
      takes: {
        where: { isWinner: true },
        take: 1,
        select: { musician: { select: { name: true } } },
      },
    },
  });

  let sent = 0;
  for (const job of jobs) {
    if (!job.payment) continue;
    const escrowHold = job.payment.status === "authorized";
    const autoAt = finalizeAutoAt(job.deadline, job.payment.createdAt, { escrowHold });

    try {
      const musicianName = job.takes[0]?.musician.name ?? null;
      await notifyProducerDeadlineReached({
        creatorId: job.creatorId,
        jobId: job.id,
        jobTitle: job.title,
        musicianName,
        finalizeBy: autoAt,
      });
      await db.job.update({
        where: { id: job.id },
        data: { finalizeReminderSentAt: new Date() },
      });
      sent += 1;
      console.log(`[finalize reminder] ${job.id}`);
    } catch (err) {
      console.error(`[finalize reminder] failed for ${job.id}`, err);
    }
  }
  return sent;
}

// Releases or refunds payment and marks the job cancelled. Used by
// both the creator-initiated cancel endpoint and the deadline sweep.
// Callers that auto-sweep must skip jobs with a selected winner (finalize those instead).
export async function cancelJobAndRefund(jobId: string) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { payment: true },
  });
  if (!job || (job.status !== "OPEN" && job.status !== "PENDING_PAYMENT" && job.status !== "CANCELLING")) {
    return;
  }

  if (job.status !== "CANCELLING") {
    const claim = await db.job.updateMany({
      where: { id: job.id, status: { in: ["OPEN", "PENDING_PAYMENT"] } },
      data: { status: "CANCELLING" },
    });
    if (claim.count !== 1) return;
  }

  let paymentStatus: "cancelled" | "refunded" = "cancelled";

  if (job.payment) {
    const piId = job.payment.stripePaymentIntentId;
    if (piId.startsWith("pending_") || piId.startsWith("cs_")) {
      // Checkout not completed — expire session if we have one.
      if (job.payment.stripeCheckoutSessionId) {
        try {
          await stripe.checkout.sessions.expire(job.payment.stripeCheckoutSessionId);
        } catch (err) {
          const code = (err as { code?: string })?.code;
          if (code !== "resource_missing" && code !== "checkout_session_unexpected_state") {
            console.warn("[cancel] expire session", err);
          }
        }
      }
    } else {
      const pi = await stripe.paymentIntents.retrieve(piId);
      if (pi.status === "requires_capture") {
        await stripe.paymentIntents.cancel(piId);
        paymentStatus = "cancelled";
      } else if (pi.status === "succeeded") {
        const refunds = await stripe.refunds.list({ payment_intent: piId, limit: 1 });
        if (refunds.data.length === 0) {
          await stripe.refunds.create(
            {
              payment_intent: piId,
              metadata: { jobId: job.id, reason: "job_cancelled" },
            },
            { idempotencyKey: `job_refund_${job.id}` }
          );
        }
        paymentStatus = "refunded";
      } else if (pi.status === "canceled") {
        paymentStatus = "cancelled";
      } else {
        // Unexpected state — do not silently mark cancelled over captured money.
        throw new Error(`Cannot cancel job: payment status is ${pi.status}`);
      }
    }
  }

  await db.$transaction([
    db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } }),
    ...(job.payment
      ? [db.payment.update({ where: { id: job.payment.id }, data: { status: paymentStatus } })]
      : []),
    db.take.updateMany({ where: { jobId: job.id, isWinner: true }, data: { isWinner: false } }),
  ]);

  if (job.status === "OPEN") {
    await notifyMusiciansJobCancelled({ jobId: job.id, jobTitle: job.title });
  }
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
      createdAt: true,
      creatorId: true,
    },
  });

  const due = jobs.filter((job) => {
    const remaining = new Date(job.deadline).getTime() - now;
    if (remaining <= 0) return false;
    // Damian D-10: a brand-new ≤3-day job is already inside the "3 days left" window;
    // don't blast "only 3 days left" seconds after the new-job alert.
    const windowMs = new Date(job.deadline).getTime() - new Date(job.createdAt).getTime();
    if (windowMs <= 3 * DAY_MS + DAY_MS) return false;
    const ageMs = now - new Date(job.createdAt).getTime();
    if (ageMs < DAY_MS) return false;
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

/** Deadline finalize, reminders, and no-winner refunds. Called from /api/cron/jobs only. */
export async function runJobMaintenance(): Promise<void> {
  await finalizeDueAwards();
  await sendDueFinalizeReminders();

  const cutoff = new Date(Date.now() - CANCEL_GRACE_PERIOD_MS);
  const expired = await db.job.findMany({
    where: {
      status: "OPEN",
      deadline: { lt: cutoff },
      takes: { none: { isWinner: true } },
    },
    select: { id: true },
    take: 20,
  });
  for (const job of expired) {
    try {
      await cancelJobAndRefund(job.id);
    } catch (err) {
      console.error(`[jobs sweep] failed for ${job.id}`, err);
    }
  }

  const stuckCancels = await db.job.findMany({
    where: { status: "CANCELLING" },
    select: { id: true },
    take: 20,
  });
  for (const job of stuckCancels) {
    try {
      await cancelJobAndRefund(job.id);
    } catch (err) {
      console.error(`[jobs sweep] cancel retry failed for ${job.id}`, err);
    }
  }

  await sendDueThreeDayReminders();
}
