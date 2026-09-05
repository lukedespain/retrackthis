import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ALL_INSTRUMENTS_ID, sanitizeInstrumentIds } from "@/lib/instruments";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

// POST /api/auth/complete-profile { name, instruments? } — creates (or updates) the
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

  const body = await req.json();
  const { name } = body;
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const instruments = sanitizeInstrumentIds(body.instruments);

  // Mutable copy — Prisma's Role[] input rejects `as const` readonly tuples.
  const roles = ["CREATOR", "MUSICIAN"] as Array<"CREATOR" | "MUSICIAN">;
  const profile = await db.user.upsert({
    where: { id: user.id },
    update: { name, role: roles, instruments },
    create: {
      id: user.id,
      email: user.email!,
      name,
      role: roles,
      instruments,
      // Job alerts on by default; narrow to instruments they picked, or all.
      notifyJobAlerts: true,
      notifyInstruments: instruments.length > 0 ? instruments : [ALL_INSTRUMENTS_ID],
    },
  });

  return NextResponse.json(profile);
}
