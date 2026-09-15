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

// POST /api/jobs/:jobId/select-winner  { takeId }
// Before the deadline: marks a provisional selection. Job stays open for more
// submissions; payment and WAV downloads wait until the deadline.
// At/after the deadline: captures payment, pays the musician, marks AWARDED.
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { takeId } = await req.json();

  const job = await db.job.findUnique({
    where: { id: params.jobId },
    include: { payment: true },
  });
  const take = await db.take.findUnique({ where: { id: takeId } });

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

  try {
    if (!pastDeadline) {
      const result = await selectProvisionalWinner(job.id, take.id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        success: true,
        provisional: true,
        message:
          "Selection saved. Payment and downloads unlock when the deadline ends. You can change your selection until then.",
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

    return NextResponse.json({ success: true, provisional: false, payout: "stripe" });
  } catch (err) {
    console.error("[select-winner]", err);
    return NextResponse.json({ error: stripeMessage(err) }, { status: 502 });
  }
}
