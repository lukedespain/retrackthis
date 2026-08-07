import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

// GET /api/auth/me — the signed-in user's app profile (name, roles), or
// null if they're authenticated but haven't completed onboarding yet.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const profile = await db.user.findUnique({ where: { id: userId } });
  return NextResponse.json({ profile });
}
