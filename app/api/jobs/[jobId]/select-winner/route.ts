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
// Before the deadline: favorite only (job stays open; submissions stay open until deadline).
// After the deadline (or AWARDING retry): award + pay + close. Early finalize is rejected.
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const takeId = body?.takeId as string | undefined;
  const wantFinalize = Boolean(body?.finalize);

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
  if (job.status === "AWARDED" || job.status === "AWARDING") {
    if (job.status === "AWARDED") {
      return NextResponse.json({ success: true, alreadyAwarded: true });
    }
  } else if (job.status !== "OPEN") {
    return NextResponse.json({ error: "Only open jobs can be awarded" }, { status: 400 });
  }

  const pastDeadline = new Date(job.deadline).getTime() <= Date.now();
  if (wantFinalize && !pastDeadline && job.status !== "AWARDING") {
    return NextResponse.json(
      {
        error:
          "Jobs stay open until the deadline so musicians get the full window. Favorite takes now, then award after the deadline.",
      },
      { status: 400 }
    );
  }

  const shouldFinalize = pastDeadline || job.status === "AWARDING";

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
          "Favorite saved (one submission at a time - this replaces any previous favorite). After the deadline you’ll have 48 hours to award; we’ll auto-award this favorite if you don’t.",
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
        message: `Awarded. Pay ${formatPayoutProviderLabel(result.provider)} manually from the admin panel. Funds are on the platform.`,
      });
    }

    return NextResponse.json({
      success: true,
      provisional: false,
      payout: "stripe",
      message: "Submission accepted. The musician is being paid and the job is closed.",
    });
  } catch (err) {
    console.error("[select-winner]", err);
    return NextResponse.json({ error: stripeMessage(err) }, { status: 502 });
  }
}
