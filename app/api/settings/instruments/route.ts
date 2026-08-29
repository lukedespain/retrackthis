import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sanitizeInstrumentIds } from "@/lib/instruments";
import { getSessionUserId } from "@/lib/supabaseServer";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { instruments: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }

  return NextResponse.json({ instruments: sanitizeInstrumentIds(user.instruments) });
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

  const instruments = sanitizeInstrumentIds(body.instruments);
  const user = await db.user.update({
    where: { id: userId },
    data: { instruments },
    select: { instruments: true },
  });

  return NextResponse.json({
    instruments: sanitizeInstrumentIds(user.instruments),
  });
}
