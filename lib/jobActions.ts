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

// How long an OPEN job can sit past its deadline with no winner before the
// lazy sweep (see GET /api/jobs) auto-cancels it. Gives the creator a window
// to notice and act instead of an abrupt cancellation the instant time's up.
export const CANCEL_GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;

// After the deadline, producers with a provisional pick get this window to
// finalize early, switch takes, or keep listening before auto-finalize.
export const FINALIZE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export const THREE_DAY_REMINDER_MS = 3 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  if (job.status !== "OPEN") {
    return { ok: false, error: "Only open jobs can be awarded", status: 400 };
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

  let paymentIntent = await stripe.paymentIntents.retrieve(job.payment.stripePaymentIntentId);
  if (paymentIntent.status === "requires_capture") {
    paymentIntent = await stripe.paymentIntents.capture(job.payment.stripePaymentIntentId);
  } else if (paymentIntent.status !== "succeeded") {
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
    await stripe.transfers.create({
      amount: payoutCents,
      currency: "usd",
      destination: musician.stripeAccountId!,
      transfer_group: job.id,
      source_transaction: chargeId,
    });
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
 * Finalize OPEN jobs whose finalize grace has ended and that already have a
 * provisional winner. Producers can still finalize earlier via select-winner.
 */
export async function finalizeDueAwards(): Promise<number> {
  const cutoff = new Date(Date.now() - FINALIZE_GRACE_PERIOD_MS);
  const due = await db.job.findMany({
    where: {
      status: "OPEN",
      deadline: { lte: cutoff },
      takes: { some: { isWinner: true } },
    },
    select: { id: true },
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
 * Email producers once when the deadline hits with a provisional selection,
 * so they can finalize now or keep reviewing during the finalize grace.
 */
export async function sendDueFinalizeReminders(): Promise<number> {
  const { emailConfigured } = await import("@/lib/email");
  if (!emailConfigured()) return 0;

  const now = new Date();
  const jobs = await db.job.findMany({
    where: {
      status: "OPEN",
      deadline: { lte: now },
      finalizeReminderSentAt: null,
      takes: { some: { isWinner: true } },
    },
    select: {
      id: true,
      title: true,
      deadline: true,
      creatorId: true,
      takes: {
        where: { isWinner: true },
        take: 1,
        select: { musician: { select: { name: true } } },
      },
    },
  });

  let sent = 0;
  for (const job of jobs) {
    try {
      const musicianName = job.takes[0]?.musician.name ?? "your selected musician";
      await notifyProducerDeadlineReached({
        creatorId: job.creatorId,
        jobId: job.id,
        jobTitle: job.title,
        musicianName,
        finalizeBy: new Date(new Date(job.deadline).getTime() + FINALIZE_GRACE_PERIOD_MS),
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

// Releases the escrowed PaymentIntent and marks the job cancelled. Used by
// both the creator-initiated cancel endpoint and the deadline sweep.
// Callers that auto-sweep must skip jobs with a selected winner (finalize those instead).
export async function cancelJobAndRefund(jobId: string) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { payment: true },
  });
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
    db.take.updateMany({ where: { jobId: job.id, isWinner: true }, data: { isWinner: false } }),
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
