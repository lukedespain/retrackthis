import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createServerSupabaseClient, getSessionUserId } from "@/lib/supabaseServer";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }

  return NextResponse.json({
    name: profile.name,
    email: user?.email ?? profile.email,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Enter a name (max 80 characters)." }, { status: 400 });
  }

  const profile = await db.user.update({
    where: { id: userId },
    data: { name },
    select: { name: true, email: true },
  });

  return NextResponse.json(profile);
}
