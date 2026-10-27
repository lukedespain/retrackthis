import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeUserCode } from "@/lib/pluginAuth";
import { getSessionUserId } from "@/lib/supabaseServer";

// GET /api/plugin/auth/lookup?code=RTKX-7Q2M — for /connect (signed in): which
// app is asking, and whether the code can still be approved.
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const userCode = normalizeUserCode(req.nextUrl.searchParams.get("code"));
  if (!userCode) return NextResponse.json({ status: "invalid" });
  const request = await db.pluginDeviceAuth.findUnique({
    where: { userCode },
    select: { clientName: true, status: true, expiresAt: true },
  });
  if (!request || request.status === "used") return NextResponse.json({ status: "invalid" });
  if (request.expiresAt < new Date()) return NextResponse.json({ status: "expired" });
  return NextResponse.json({ status: request.status, clientName: request.clientName, userCode });
}
