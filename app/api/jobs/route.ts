import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CANCEL_GRACE_PERIOD_MS, cancelJobAndRefund } from "@/lib/jobActions";
import { notifyJobInvites, notifyNewJobPosted } from "@/lib/notify";
import { stripe } from "@/lib/stripe";
import { getSessionUserId } from "@/lib/supabaseServer";
import { isAllowedInstrumentId, labelForInstrumentId } from "@/lib/instruments";

function sanitizeInviteEmails(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const emails = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
  return Array.from(new Set(emails)).slice(0, 5);
}

// POST /api/jobs — creator posts a new job.
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
    priceCents,
    deadline,
    paymentMethodId,
    bpm,
    inviteEmails,
  } = body;

  if (!title || !description || !demoFileUrl || !priceCents || !deadline || !paymentMethodId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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

  if (!Number.isFinite(priceCents) || priceCents < 100) {
    return NextResponse.json({ error: "Price must be at least $1" }, { status: 400 });
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
      demoFileUrl,
      priceCents,
      bpm: bpmValue,
      deadline: new Date(deadline),
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

// GET /api/jobs — list open jobs for musicians to browse.
// Pass ?mine=true to instead get the signed-in creator's jobs across all
// statuses (used by the creator dashboard).
//
// Also does a lazy sweep: any OPEN job whose deadline passed more than
// CANCEL_GRACE_PERIOD_MS ago with no winner gets auto-cancelled (refunded)
// right here before we respond, instead of needing a real cron job.
export async function GET(req: NextRequest) {
  let where: { creatorId: string } | { status: "OPEN" } = { status: "OPEN" };
  if (req.nextUrl.searchParams.get("mine") === "true") {
    const creatorId = await getSessionUserId();
    if (!creatorId) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    where = { creatorId };
  }

  const jobs = await db.job.findMany({ where, orderBy: { createdAt: "desc" } });

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

  const expiredIds = new Set(expired.map((job) => job.id));
  const visible =
    "status" in where && where.status === "OPEN"
      ? jobs.filter((job) => !expiredIds.has(job.id))
      : jobs;

  return NextResponse.json(visible);
}
