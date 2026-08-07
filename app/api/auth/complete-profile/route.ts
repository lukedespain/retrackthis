import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

// POST /api/auth/complete-profile { name } — creates (or updates) the
// app-level User row for the signed-in Supabase Auth user. Runs once,
// right after signup/first login, since Auth only knows email/password —
// name is ours to collect. Every account gets both roles: nothing gates on
// picking one, and someone can post a job today and submit a take tomorrow.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const roles = ["CREATOR", "MUSICIAN"] as const;
  const profile = await db.user.upsert({
    where: { id: user.id },
    update: { name, role: roles },
    create: { id: user.id, email: user.email!, name, role: roles },
  });

  return NextResponse.json(profile);
}
