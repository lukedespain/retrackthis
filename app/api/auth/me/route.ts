import { NextResponse } from "next/server";
import { emailIsAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { createServerSupabaseClient, getSessionUserId } from "@/lib/supabaseServer";

// GET /api/auth/me — the signed-in user's app profile (name, roles), or
// null if they're authenticated but haven't completed onboarding yet.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let profile = await db.user.findUnique({ where: { id: userId } });

  // Bootstrap / promote allowlisted emails (e.g. music@lukedespain.com) to admin.
  if (profile && !profile.isAdmin) {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (emailIsAdmin(user?.email ?? profile.email)) {
      profile = await db.user.update({
        where: { id: userId },
        data: { isAdmin: true },
      });
    }
  }

  return NextResponse.json({ profile });
}
