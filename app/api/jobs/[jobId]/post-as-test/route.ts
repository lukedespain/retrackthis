import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/**
 * Admin: turn an unpaid draft (and any parts on the same checkout) into a test job.
 * No charge, no emails, hidden from Find work.
 * POST /api/jobs/:jobId/post-as-test
 */
export async function POST(_req: Request, { params }: { params: { jobId: string } }) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Test jobs are for admins only." }, { status: 403 });
  }

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    include: { payment: true },
  });
  if (!job || job.creatorId !== admin.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.isTest && job.status === "OPEN") {
    return NextResponse.json({ id: job.id, status: "OPEN", isTest: true });
  }
  if (job.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "Only an unpaid draft can be posted as a test." }, { status: 400 });
  }

  const sessionId = job.payment?.stripeCheckoutSessionId ?? null;
  const related = sessionId
    ? await db.job.findMany({
        where: {
          creatorId: admin.id,
          status: "PENDING_PAYMENT",
          payment: { stripeCheckoutSessionId: sessionId },
        },
        include: { payment: true },
      })
    : [job];

  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.status === "complete" || session.payment_status === "paid") {
        return NextResponse.json({ error: "This checkout already completed." }, { status: 400 });
      }
      if (session.status === "open") {
        await stripe.checkout.sessions.expire(sessionId);
      }
    } catch (err) {
      console.warn("[post-as-test] checkout", err);
    }
  }

  const ids: string[] = [];
  for (const part of related) {
    await db.job.update({
      where: { id: part.id },
      data: { status: "OPEN", isTest: true },
    });
    if (part.payment) {
      await db.payment.update({
        where: { id: part.payment.id },
        data: {
          stripePaymentIntentId: `test_${crypto.randomUUID()}`,
          status: "captured",
          platformFeeCents: 0,
        },
      });
    }
    ids.push(part.id);
  }

  return NextResponse.json({ id: ids[0], ids, status: "OPEN", isTest: true });
}
