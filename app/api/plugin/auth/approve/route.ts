import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeUserCode } from "@/lib/pluginAuth";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/plugin/auth/approve { code, approve } — website only (session cookie).
// Links a pending sign-in request to the signed-in user, or denies it.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const userCode = normalizeUserCode(body?.code);
  if (!userCode || typeof body?.approve !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const updated = await db.pluginDeviceAuth.updateMany({
    where: { userCode, status: "pending", expiresAt: { gt: new Date() } },
    data: body.approve ? { status: "approved", userId } : { status: "denied" },
  });
  if (updated.count !== 1) {
    return NextResponse.json({ error: "That code expired or was already used. Start again in your DAW." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, status: body.approve ? "approved" : "denied" });
}
