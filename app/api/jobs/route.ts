import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/appUrl";
import { db } from "@/lib/db";
import { CANCEL_GRACE_PERIOD_MS } from "@/lib/jobActions";
import { stripe } from "@/lib/stripe";
import { getSessionUserId } from "@/lib/supabaseServer";
import { getAdminUser } from "@/lib/admin";
import { resolvePostableInstrument } from "@/lib/approvedInstruments";
import {
  isTestInstrumentId,
  TEST_INSTRUMENT_ID,
  TEST_INSTRUMENT_LABEL,
} from "@/lib/instruments";
import { sanitizeMusicalKey } from "@/lib/musicalKeys";
import {
  POST_DEADLINE_MAX_DAYS,
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
  if (Array.isArray(body?.parts) && body.parts.length > 1) {
    return createPartBundle(creatorId, body);
  }
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

  const requestedTest = body.isTest === true;
  const isTest = requestedTest || isTestInstrumentId(resolvedInstrumentId);
  if (isTest) {
    if (!(await getAdminUser())) {
      return NextResponse.json({ error: "Test jobs are for admins only." }, { status: 403 });
    }
    if (!requestedTest) {
      instrumentLabel = TEST_INSTRUMENT_LABEL;
    }
  }
  if (requestedTest || (!isTest && resolvedInstrumentId)) {
    const postable = await resolvePostableInstrument(resolvedInstrumentId);
    if (!postable) {
      return NextResponse.json({ error: "Pick an instrument for this job." }, { status: 400 });
    }
    resolvedInstrumentId = postable.id;
    instrumentLabel = postable.label;
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
  const maxDeadlineMs = Date.now() + POST_DEADLINE_MAX_DAYS * 24 * 60 * 60 * 1000 + 60_000;
  if (deadlineDate.getTime() > maxDeadlineMs) {
    return NextResponse.json(
      { error: `Deadline can’t be more than ${POST_DEADLINE_MAX_DAYS} days out.` },
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

  if (isTest) {
    // Test jobs skip Stripe entirely: live immediately with a simulated paid-upfront
    // payment, and no new-job alerts or invites.
    const testJob = await db.job.create({
      data: {
        creatorId,
        title: titleStr,
        instrument: instrumentLabel,
        instrumentId: requestedTest ? resolvedInstrumentId : TEST_INSTRUMENT_ID,
        description: descriptionStr,
        demoFileUrl: demoFileUrl.trim(),
        backingFileUrl: backing,
        priceCents,
        durationSeconds: durationSecondsInt,
        musicalKey: musicalKeyValue,
        bpm: bpmValue,
        deadline: deadlineDate,
        status: "OPEN",
        isTest: true,
        payment: {
          create: {
            stripePaymentIntentId: `test_${crypto.randomUUID()}`,
            amountCents: priceCents,
            platformFeeCents: 0,
            status: "captured",
          },
        },
      },
    });
    return NextResponse.json({ id: testJob.id, status: "OPEN", isTest: true }, { status: 201 });
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
  let where:
    | { creatorId: string }
    | { status: "OPEN"; isTest: false }
    | { status: "OPEN"; OR: Array<{ isTest: false } | { isTest: true; creatorId: { not: string } }> } = {
    status: "OPEN",
    isTest: false,
  };
  if (req.nextUrl.searchParams.get("mine") === "true") {
    const creatorId = await getSessionUserId();
    if (!creatorId) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    where = { creatorId };
  } else {
    const admin = await getAdminUser();
    where = admin
      ? {
          status: "OPEN",
          OR: [{ isTest: false }, { isTest: true, creatorId: { not: admin.id } }],
        }
      : { status: "OPEN", isTest: false };
  }

  const jobs = await db.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { takes: true } },
      takes: { where: { isWinner: true }, select: { id: true }, take: 1 },
      payment: { select: { status: true } },
      creator: { select: { name: true, avatar: true } },
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
    visible.map(({ _count, takes: winningTakes, payment, creator, ...job }) => ({
      ...job,
      poster: creator ? { name: creator.name, avatar: creator.avatar } : null,
      takeCount: _count.takes,
      hasSelectedWinner: winningTakes.length > 0,
      paymentStatus: payment?.status ?? null,
    }))
  );
}

type BundlePart = {
  instrumentId?: string;
  description?: string;
  demoFileUrl?: string;
  backingFileUrl?: string | null;
  priceCents?: number;
  durationSeconds?: number;
  deadline?: string;
};

/** One Stripe charge covering several parts. Each part is its own job. */
async function createPartBundle(
  creatorId: string,
  body: {
    title?: string;
    musicalKey?: unknown;
    bpm?: unknown;
    inviteEmails?: unknown;
    isTest?: boolean;
    parts?: BundlePart[];
  }
) {
  const parts = body.parts ?? [];
  if (parts.length < 2 || parts.length > 8) {
    return NextResponse.json({ error: "A project can include 2 to 8 parts." }, { status: 400 });
  }
  const title = String(body.title ?? "").trim().slice(0, 90);
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const musicalKeyValue = sanitizeMusicalKey(body.musicalKey);
  let bpmValue: number | null = null;
  if (body.bpm !== null && body.bpm !== undefined && body.bpm !== "") {
    const parsed = Number(body.bpm);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 400) {
      return NextResponse.json({ error: "BPM must be between 1 and 400" }, { status: 400 });
    }
    bpmValue = Math.round(parsed);
  }

  const admin = await getAdminUser();
  const requestedTest = body.isTest === true;
  if (requestedTest && !admin) {
    return NextResponse.json({ error: "Test jobs are for admins only." }, { status: 403 });
  }
  const ready: Array<{
    instrumentId: string;
    instrument: string;
    description: string;
    demoFileUrl: string;
    backingFileUrl: string | null;
    priceCents: number;
    durationSeconds: number;
    deadline: Date;
    isTest: boolean;
  }> = [];

  for (const part of parts) {
    const instrumentId = typeof part.instrumentId === "string" ? part.instrumentId.trim() : "";
    const legacyTest = isTestInstrumentId(instrumentId);
    const isTest = requestedTest || legacyTest;
    if (legacyTest && !admin) {
      return NextResponse.json({ error: "Test jobs are for admins only." }, { status: 403 });
    }
    const postable = await resolvePostableInstrument(instrumentId);
    if (!postable) {
      return NextResponse.json({ error: "Pick an instrument for each part." }, { status: 400 });
    }
    const description = String(part.description ?? "").trim().slice(0, 5000);
    const demoFileUrl = typeof part.demoFileUrl === "string" ? part.demoFileUrl.trim() : "";
    if (!description || !demoFileUrl) {
      return NextResponse.json({ error: "Each part needs notes and a Part file." }, { status: 400 });
    }
    const priceCents = Number(part.priceCents);
    if (!Number.isInteger(priceCents) || priceCents < MIN_PRICE_CENTS || priceCents > MAX_PRICE_CENTS) {
      return NextResponse.json(
        { error: `Each budget must be between $${SLIDER_MIN_USD} and $${SLIDER_MAX_USD}.` },
        { status: 400 }
      );
    }
    const durationValue = Number(part.durationSeconds);
    if (
      !Number.isFinite(durationValue) ||
      durationValue < MIN_DURATION_SECONDS ||
      durationValue > MAX_DURATION_SECONDS
    ) {
      return NextResponse.json({ error: "Set how long each part plays." }, { status: 400 });
    }
    const deadline = new Date(String(part.deadline ?? ""));
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Each part needs a future due date." }, { status: 400 });
    }
    if (deadline.getTime() > Date.now() + POST_DEADLINE_MAX_DAYS * 86400000 + 60_000) {
      return NextResponse.json(
        { error: `Due dates can’t be more than ${POST_DEADLINE_MAX_DAYS} days out.` },
        { status: 400 }
      );
    }
    const backing =
      typeof part.backingFileUrl === "string" && part.backingFileUrl.trim()
        ? part.backingFileUrl.trim()
        : null;
    const { assertAppStorageUrls } = await import("@/lib/storageUrls");
    const storageError = assertAppStorageUrls([demoFileUrl, backing]);
    if (storageError) return NextResponse.json({ error: storageError }, { status: 400 });
    ready.push({
      instrumentId: legacyTest ? TEST_INSTRUMENT_ID : postable.id,
      instrument: legacyTest ? TEST_INSTRUMENT_LABEL : postable.label,
      description,
      demoFileUrl,
      backingFileUrl: backing,
      priceCents,
      durationSeconds: Math.round(durationValue),
      deadline,
      isTest,
    });
  }

  if (ready.some((part) => part.isTest) && ready.some((part) => !part.isTest)) {
    return NextResponse.json({ error: "Test parts can’t be mixed with paid parts." }, { status: 400 });
  }

  const invites = sanitizeInviteEmails(body.inviteEmails);

  if (ready.every((part) => part.isTest)) {
    const ids: string[] = [];
    for (const part of ready) {
      const job = await db.job.create({
        data: {
          creatorId,
          title: `${title}: ${part.instrument}`.slice(0, 120),
          instrument: part.instrument,
          instrumentId: part.instrumentId,
          description: part.description,
          demoFileUrl: part.demoFileUrl,
          backingFileUrl: part.backingFileUrl,
          priceCents: part.priceCents,
          durationSeconds: part.durationSeconds,
          musicalKey: musicalKeyValue,
          bpm: bpmValue,
          deadline: part.deadline,
          status: "OPEN",
          isTest: true,
          payment: {
            create: {
              stripePaymentIntentId: `test_${crypto.randomUUID()}`,
              amountCents: part.priceCents,
              platformFeeCents: 0,
              status: "captured",
            },
          },
        },
      });
      ids.push(job.id);
    }
    return NextResponse.json({ id: ids[0], ids, status: "OPEN", isTest: true }, { status: 201 });
  }

  const created = [];
  for (const part of ready) {
    const job = await db.job.create({
      data: {
        creatorId,
        title: `${title}: ${part.instrument}`.slice(0, 120),
        instrument: part.instrument,
        instrumentId: part.instrumentId,
        description: part.description,
        demoFileUrl: part.demoFileUrl,
        backingFileUrl: part.backingFileUrl,
        priceCents: part.priceCents,
        durationSeconds: part.durationSeconds,
        musicalKey: musicalKeyValue,
        bpm: bpmValue,
        deadline: part.deadline,
        status: "PENDING_PAYMENT",
      },
    });
    created.push(job);
  }

  const base = appBaseUrl();
  const jobIds = created.map((job) => job.id).join(",");
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      return_url: `${base}/producers?posted=1&job=${created[0].id}&session_id={CHECKOUT_SESSION_ID}`,
      client_reference_id: created[0].id,
      metadata: {
        jobId: created[0].id,
        jobIds: jobIds.slice(0, 500),
        creatorId,
        inviteEmails: invites.join(",").slice(0, 450),
      },
      payment_intent_data: {
        metadata: { jobIds: jobIds.slice(0, 500), creatorId },
      },
      custom_text: {
        submit: {
          message:
            "One charge covers every part. Each part is its own job. Cancel a part before you pick a winner and that part is refunded.",
        },
      },
      line_items: created.map((job) => ({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: job.priceCents,
          product_data: {
            name: `Retrack This: ${job.title}`.slice(0, 120),
            description: `${job.instrument} · paid upfront; musician is paid when you pick a winner`.slice(0, 500),
          },
        },
      })),
    });
  } catch (err) {
    await db.job.deleteMany({ where: { id: { in: created.map((job) => job.id) } } }).catch(() => {});
    console.error("[jobs POST] bundle checkout", err);
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 502 });
  }

  if (!session.client_secret) {
    await db.job.deleteMany({ where: { id: { in: created.map((job) => job.id) } } }).catch(() => {});
    return NextResponse.json({ error: "Checkout did not return a client secret" }, { status: 502 });
  }

  await db.payment.createMany({
    data: created.map((job) => ({
      jobId: job.id,
      stripePaymentIntentId: `pending_${session.id}_${job.id}`,
      stripeCheckoutSessionId: session.id,
      amountCents: job.priceCents,
      platformFeeCents: 0,
      status: "pending_checkout",
    })),
  });

  return NextResponse.json(
    {
      id: created[0].id,
      ids: created.map((job) => job.id),
      status: "PENDING_PAYMENT",
      clientSecret: session.client_secret,
      checkoutSessionId: session.id,
      amountCents: created.reduce((sum, job) => sum + job.priceCents, 0),
    },
    { status: 201 }
  );
}
