import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

// GET /api/takes/mine — the signed-in musician's submitted takes, with
// enough job context to show status (pending / won / not selected).
export async function GET() {
  const musicianId = await getSessionUserId();
  if (!musicianId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const takes = await db.take.findMany({
    where: { musicianId },
    include: { job: { select: { id: true, title: true, instrument: true, priceCents: true, status: true } } },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(takes);
}
