import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

// Whether the signed-in user shows in the homepage community (see /api/community).
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: userId }, select: { showInCommunity: true } });
  if (!user) return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.showInCommunity !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const user = await db.user.update({
    where: { id: userId },
    data: { showInCommunity: body.showInCommunity },
    select: { showInCommunity: true },
  });
  return NextResponse.json(user);
}
