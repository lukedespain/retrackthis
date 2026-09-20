import { NextRequest, NextResponse } from "next/server";
import { formatPayoutProviderLabel } from "@/lib/connectCountries";
import { db } from "@/lib/db";
import { finalizeAward, selectProvisionalWinner } from "@/lib/jobActions";
import { getSessionUserId } from "@/lib/supabaseServer";

function stripeMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return err instanceof Error ? err.message : "Something went wrong awarding this take";
}

// POST /api/jobs/:jobId/select-winner  { takeId, finalize?: boolean }
// Default before the deadline: provisional pick (job stays open).
// finalize: true (or past deadline): capture payment, pay musician, close as AWARDED.
// Early finalize matters — Stripe auth holds die ~7 days after the job was posted.
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const takeId = body?.takeId as string | undefined;
  const forceFinalize = Boolean(body?.finalize);

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    include: { payment: true },
  });
  const take = takeId ? await db.take.findUnique({ where: { id: takeId } }) : null;

  if (!job || !job.payment || !take || take.jobId !== job.id) {
    return NextResponse.json({ error: "Job or take not found" }, { status: 404 });
  }
  if (job.creatorId !== sessionUserId) {
    return NextResponse.json({ error: "Not authorized to select a winner for this job" }, { status: 403 });
  }
  if (job.status === "AWARDED") {
    return NextResponse.json({ success: true, alreadyAwarded: true });
  }
  if (job.status !== "OPEN") {
    return NextResponse.json({ error: "Only open jobs can be awarded" }, { status: 400 });
  }

  const pastDeadline = new Date(job.deadline).getTime() <= Date.now();
  const shouldFinalize = forceFinalize || pastDeadline;

  try {
    if (!shouldFinalize) {
      const result = await selectProvisionalWinner(job.id, take.id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        success: true,
        provisional: true,
        message:
          "Pick saved. You can still switch takes, or end the gig anytime to pay and close it — don’t wait past the card hold (~7 days from posting).",
      });
    }

    const result = await finalizeAward(job.id, take.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (result.payout === "manual") {
      return NextResponse.json({
        success: true,
        provisional: false,
        payout: "manual",
        provider: result.provider,
        payoutEmail: result.payoutEmail,
        payoutAccountName: result.payoutAccountName,
        message: `Awarded. Pay ${formatPayoutProviderLabel(result.provider)} manually. Funds are captured on the platform.`,
      });
    }

    return NextResponse.json({
      success: true,
      provisional: false,
      payout: "stripe",
      message: "Gig closed. Payment captured and the musician is being paid.",
    });
  } catch (err) {
    console.error("[select-winner]", err);
    return NextResponse.json({ error: stripeMessage(err) }, { status: 502 });
  }
}
