import { NextResponse } from "next/server";
import { getMusicianPayoutSnapshot } from "@/lib/musicianPayouts";
import { getSessionUserId } from "@/lib/supabaseServer";

// GET /api/payouts/status
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const snapshot = await getMusicianPayoutSnapshot(userId);
  return NextResponse.json(snapshot);
}
