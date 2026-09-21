import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/appUrl";
import { db } from "@/lib/db";
import { CANCEL_GRACE_PERIOD_MS } from "@/lib/jobActions";
import { notifyJobInvites, notifyNewJobPosted } from "@/lib/notify";
import { stripe } from "@/lib/stripe";
import { getSessionUserId } from "@/lib/supabaseServer";
import { isAllowedInstrumentId, labelForInstrumentId } from "@/lib/instruments";
import { sanitizeMusicalKey } from "@/lib/musicalKeys";
import {
  MAX_DEADLINE_DAYS,
  MAX_DURATION_SECONDS,
  MAX_PRICE_CENTS,
  MIN_DURATION_SECONDS,
  MIN_PRICE_CENTS,
  SLIDER_MAX_USD,
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

// POST /api/jobs - creator posts a new job and is sent to Stripe Checkout
// (charge-upfront). Job stays PENDING_PAYMENT until checkout.session.completed.
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
    bpm,
    inviteEmails,
  } = body;

  if (!title || !description || !demoFileUrl || !priceCents || !deadline) {
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

  if (!Number.isInteger(priceCents) || priceCents < MIN_PRICE_CENTS || priceCents > MAX_PRICE_CENTS) {
    return NextResponse.json(
      {
        error: `Price must be a whole-dollar amount between $${SLIDER_MIN_USD} and $${SLIDER_MAX_USD}`,
      },
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
  if (deadlineDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Deadline must be in the future" }, { status: 400 });
  }
  const maxDeadlineMs = Date.now() + MAX_DEADLINE_DAYS * 24 * 60 * 60 * 1000 + 60_000;
  if (deadlineDate.getTime() > maxDeadlineMs) {
    return NextResponse.json(
      { error: `Deadline can’t be more than ${MAX_DEADLINE_DAYS} days out.` },
      { status: 400 }
    );
  }

  const { assertAppStorageUrls } = await import("@/lib/storageUrls");
  const storageError = assertAppStorageUrls([demoFileUrl, backing]);
  if (storageError) {
    return NextResponse.json({ error: storageError }, { status: 400 });
  }

  let bpmValue: number | null = null;
  if (bpm !== null && bpm !== undefined && bpm !== "") {
    const parsed = Number(bpm);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 400) {
      return NextResponse.json({ error: "BPM must be between 1 and 400" }, { status: 400 });
    }
    bpmValue = Math.round(parsed);
  }

  const titleStr = String(title).trim().slice(0, 120);
  const descriptionStr = String(description).trim().slice(0, 5000);
  if (!titleStr || !descriptionStr) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const base = appBaseUrl();
  const job = await db.job.create({
    data: {
      creatorId,
      title: titleStr,
      instrument: instrumentLabel,
      instrumentId: resolvedInstrumentId || null,
      description: descriptionStr,
      demoFileUrl: demoFileUrl.trim(),
      backingFileUrl: backing,
      priceCents,
      durationSeconds: durationSecondsInt,
      musicalKey: musicalKeyValue,
      bpm: bpmValue,
      deadline: deadlineDate,
      status: "PENDING_PAYMENT",
    },
  });

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        ui_mode: "embedded",
        mode: "payment",
        return_url: `${base}/producers?posted=1&job=${job.id}&session_id={CHECKOUT_SESSION_ID}`,
        client_reference_id: job.id,
        metadata: {
          jobId: job.id,
          creatorId,
          inviteEmails: invites.join(",").slice(0, 450),
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
              unit_amount: priceCents,
              product_data: {
                name: `Retrack This: ${titleStr}`.slice(0, 120),
                description: `${instrumentLabel} · paid upfront; musician is paid when you pick a winner`.slice(
                  0,
                  500
                ),
              },
            },
          },
        ],
      },
      { idempotencyKey: `job_checkout_embed_${job.id}` }
    );
  } catch (err) {
    await db.job.delete({ where: { id: job.id } }).catch(() => {});
    console.error("[jobs POST] checkout session", err);
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 502 });
  }

  if (!session.client_secret) {
    await db.job.delete({ where: { id: job.id } }).catch(() => {});
    return NextResponse.json({ error: "Checkout did not return a client secret" }, { status: 502 });
  }

  await db.payment.create({
    data: {
      jobId: job.id,
      stripePaymentIntentId: `pending_${session.id}`,
      stripeCheckoutSessionId: session.id,
      amountCents: priceCents,
      platformFeeCents: 0,
      status: "pending_checkout",
    },
  });

  return NextResponse.json(
    {
      id: job.id,
      status: "PENDING_PAYMENT",
      clientSecret: session.client_secret,
      checkoutSessionId: session.id,
    },
    { status: 201 }
  );
}

// GET /api/jobs - list open jobs for musicians to browse.
// Pass ?mine=true for the signed-in creator's jobs (all statuses).
//
// Money sweeps (finalize, refund, reminders) run from /api/cron/jobs - not here.
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
    include: {
      _count: { select: { takes: true } },
      takes: { where: { isWinner: true }, select: { id: true }, take: 1 },
      payment: { select: { status: true } },
    },
  });

  const now = Date.now();
  const pastDeadlineNoWinner = jobs.filter(
    (job) =>
      job.status === "OPEN" &&
      job.takes.length === 0 &&
      new Date(job.deadline).getTime() + CANCEL_GRACE_PERIOD_MS < now
  );

  const hideFromBrowse = new Set(
    jobs
      .filter((job) => {
        if (job.status !== "OPEN") return false;
        const deadlineMs = new Date(job.deadline).getTime();
        if (deadlineMs <= now) return true;
        return false;
      })
      .map((job) => job.id)
  );
  for (const job of pastDeadlineNoWinner) hideFromBrowse.add(job.id);

  const visible =
    "status" in where && where.status === "OPEN"
      ? jobs.filter((job) => !hideFromBrowse.has(job.id))
      : jobs;

  return NextResponse.json(
    visible.map(({ _count, takes: winningTakes, payment, ...job }) => ({
      ...job,
      takeCount: _count.takes,
      hasSelectedWinner: winningTakes.length > 0,
      paymentStatus: payment?.status ?? null,
    }))
  );
}
