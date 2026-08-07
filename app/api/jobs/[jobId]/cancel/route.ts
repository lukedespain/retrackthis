import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cancelJobAndRefund } from "@/lib/jobActions";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/jobs/:jobId/cancel
// Creator cancels their own OPEN job — releases the Stripe authorization
// hold (no charge occurs) and marks the job CANCELLED. Lets a creator back
// out with a full refund if no take is a good fit.
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const creatorId = await getSessionUserId();
  if (!creatorId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const job = await db.job.findUnique({ where: { id: params.jobId } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.creatorId !== creatorId) {
    return NextResponse.json({ error: "Not authorized to cancel this job" }, { status: 403 });
  }
  if (job.status !== "OPEN") {
    return NextResponse.json({ error: "Only open jobs can be cancelled" }, { status: 400 });
  }

  await cancelJobAndRefund(job.id);

  return NextResponse.json({ success: true });
}
