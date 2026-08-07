import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CANCEL_GRACE_PERIOD_MS, cancelJobAndRefund } from "@/lib/jobActions";
import { stripe } from "@/lib/stripe";
import { getSessionUserId } from "@/lib/supabaseServer";

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
  const { title, instrument, description, demoFileUrl, priceCents, deadline, paymentMethodId, bpm } =
    body;

  if (!title || !instrument || !demoFileUrl || !priceCents || !deadline || !paymentMethodId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

  const paymentIntent = await stripe.paymentIntents.create({
    amount: priceCents,
    currency: "usd",
    payment_method: paymentMethodId,
    capture_method: "manual", // authorize now, capture later on winner selection
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });

  const job = await db.job.create({
    data: {
      creatorId,
      title,
      instrument,
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

  if (expired.length > 0) {
    await Promise.all(expired.map((job) => cancelJobAndRefund(job.id)));
    const refreshed = await db.job.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json(refreshed);
  }

  return NextResponse.json(jobs);
}
