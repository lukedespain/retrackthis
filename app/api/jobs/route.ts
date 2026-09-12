import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CANCEL_GRACE_PERIOD_MS, cancelJobAndRefund, sendDueThreeDayReminders } from "@/lib/jobActions";
import { notifyJobInvites, notifyNewJobPosted } from "@/lib/notify";
import { stripe } from "@/lib/stripe";
import { getSessionUserId } from "@/lib/supabaseServer";
import { isAllowedInstrumentId, labelForInstrumentId } from "@/lib/instruments";
import { sanitizeMusicalKey } from "@/lib/musicalKeys";
import {
  MAX_DEADLINE_DAYS,
  MAX_DURATION_SECONDS,
  MIN_DURATION_SECONDS,
  MIN_PRICE_CENTS,
  SLIDER_MIN_USD,
} from "@/lib/jobPricing";

function sanitizeInviteEmails(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const emails = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
  return Array.from(new Set(emails)).slice(0, 5);
}

// POST /api/jobs - creator posts a new job.
// Creates the Job row AND authorizes (but does not capture) a Stripe
// PaymentIntent for the price. This is the escrow: funds are held on the
// creator's card, not charged, until a winner is picked.
export async function POST(req: NextRequest) {
  const creatorId = await getSessionUserId();
  if (!creatorId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    instrument,
    instrumentId,
    description,
    demoFileUrl,
    backingFileUrl,
    priceCents,
    durationSeconds,
    musicalKey,
    deadline,
    paymentMethodId,
    bpm,
    inviteEmails,
  } = body;

  if (!title || !description || !demoFileUrl || !priceCents || !deadline || !paymentMethodId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof demoFileUrl !== "string" || !demoFileUrl.trim()) {
    return NextResponse.json(
      { error: "Upload the part being retracked (e.g. vocal demo)." },
      { status: 400 }
    );
  }

  const backing =
    typeof backingFileUrl === "string" && backingFileUrl.trim() ? backingFileUrl.trim() : null;

  let instrumentLabel = typeof instrument === "string" ? instrument.trim() : "";
  let resolvedInstrumentId = typeof instrumentId === "string" ? instrumentId.trim() : "";

  if (resolvedInstrumentId) {
    if (!isAllowedInstrumentId(resolvedInstrumentId)) {
      return NextResponse.json({ error: "Invalid instrument" }, { status: 400 });
    }
    instrumentLabel = labelForInstrumentId(resolvedInstrumentId);
  }

  if (!instrumentLabel) {
    return NextResponse.json({ error: "Pick an instrument for this job." }, { status: 400 });
  }

  const invites = sanitizeInviteEmails(inviteEmails);

  if (typeof paymentMethodId !== "string" || !paymentMethodId.startsWith("pm_")) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  if (!Number.isFinite(priceCents) || priceCents < MIN_PRICE_CENTS) {
    return NextResponse.json(
      { error: `Price must be at least $${SLIDER_MIN_USD}` },
      { status: 400 }
    );
  }

  const durationValue = Number(durationSeconds);
  if (
    !Number.isFinite(durationValue) ||
    durationValue < MIN_DURATION_SECONDS ||
    durationValue > MAX_DURATION_SECONDS
  ) {
    return NextResponse.json(
      {
        error: `Part length must be between ${MIN_DURATION_SECONDS} seconds and ${
          MAX_DURATION_SECONDS / 60
        } minutes.`,
      },
      { status: 400 }
    );
  }
  const durationSecondsInt = Math.round(durationValue);

  const musicalKeyValue = sanitizeMusicalKey(musicalKey);

  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
  }
  const maxDeadlineMs = Date.now() + MAX_DEADLINE_DAYS * 24 * 60 * 60 * 1000 + 60_000;
  if (deadlineDate.getTime() > maxDeadlineMs) {
    return NextResponse.json(
      { error: `Deadline must be within ${MAX_DEADLINE_DAYS} days so the escrow hold stays valid.` },
      { status: 400 }
    );
  }

  // bpm: number = fixed tempo; null/undefined/empty = flexible
  let bpmValue: number | null = null;
  if (bpm !== null && bpm !== undefined && bpm !== "") {
    const parsed = Number(bpm);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 400) {
      return NextResponse.json({ error: "BPM must be between 1 and 400" }, { status: 400 });
    }
    bpmValue = Math.round(parsed);
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(priceCents),
      currency: "usd",
      payment_method: paymentMethodId,
      capture_method: "manual",
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Card authorization failed. Try another card.";
    return NextResponse.json({ error: message }, { status: 402 });
  }

  if (paymentIntent.status !== "requires_capture" && paymentIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: `Unexpected payment status: ${paymentIntent.status}` },
      { status: 402 }
    );
  }
  const job = await db.job.create({
    data: {
      creatorId,
      title,
      instrument: instrumentLabel,
      instrumentId: resolvedInstrumentId || null,
      description,
      demoFileUrl: demoFileUrl.trim(),
      backingFileUrl: backing,
      priceCents,
      durationSeconds: durationSecondsInt,
      musicalKey: musicalKeyValue,
      bpm: bpmValue,
      deadline: deadlineDate,
      payment: {
        create: {
          stripePaymentIntentId: paymentIntent.id,
          amountCents: priceCents,
          platformFeeCents: 0, // computed at award time, once we know the winner
          status: "authorized",
        },
      },
    },
    include: { payment: true },
  });

  await notifyNewJobPosted(job);

  if (invites.length > 0) {
    const creator = await db.user.findUnique({
      where: { id: creatorId },
      select: { name: true },
    });
    await notifyJobInvites({
      job,
      creatorName: creator?.name ?? "A creator",
      emails: invites,
    });
  }

  return NextResponse.json(job, { status: 201 });
}

// GET /api/jobs - list open jobs for musicians to browse.
// Pass ?mine=true to instead get the signed-in creator's jobs across all
// statuses (used by the creator dashboard).
//
// Also does a lazy sweep: any OPEN job whose deadline passed more than
// CANCEL_GRACE_PERIOD_MS ago with no winner gets auto-cancelled (refunded)
// right here before we respond, instead of needing a real cron job.
// Separately, OPEN jobs with ≤3 days left get a one-time reminder email.
export async function GET(req: NextRequest) {
  let where: { creatorId: string } | { status: "OPEN" } = { status: "OPEN" };
  if (req.nextUrl.searchParams.get("mine") === "true") {
    const creatorId = await getSessionUserId();
    if (!creatorId) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    where = { creatorId };
  }

  const jobs = await db.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { takes: true } } },
  });

  const now = Date.now();
  const expired = jobs.filter(
    (job) => job.status === "OPEN" && new Date(job.deadline).getTime() + CANCEL_GRACE_PERIOD_MS < now
  );

  // Don't block the marketplace on Stripe cancels (that was hanging /jobs).
  // Hide past-grace jobs from OPEN browse and sweep in the background.
  if (expired.length > 0) {
    for (const job of expired) {
      void cancelJobAndRefund(job.id).catch((err) => {
        console.error(`[jobs sweep] failed for ${job.id}`, err);
      });
    }
  }

  // One-time "3 days left" emails for matching musicians who have not submitted.
  // Await so Vercel does not freeze the function before Resend finishes.
  try {
    await sendDueThreeDayReminders();
  } catch (err) {
    console.error("[jobs three-day sweep]", err);
  }

  const expiredIds = new Set(expired.map((job) => job.id));
  const visible =
    "status" in where && where.status === "OPEN"
      ? jobs.filter((job) => !expiredIds.has(job.id))
      : jobs;

  return NextResponse.json(
    visible.map(({ _count, ...job }) => ({
      ...job,
      takeCount: _count.takes,
    }))
  );
}
