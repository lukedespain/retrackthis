import { NextRequest, NextResponse } from "next/server";
import { labelAlreadyOnSite } from "@/lib/approvedInstruments";
import { db } from "@/lib/db";
import { INSTRUMENT_GROUPS } from "@/lib/instruments";
import { getSessionUserId } from "@/lib/supabaseServer";

const GROUP_IDS = new Set(INSTRUMENT_GROUPS.map((group) => group.id));

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim().replace(/\s+/g, " ") : "";
  if (label.length < 2 || label.length > 48) {
    return NextResponse.json({ error: "Name the instrument in 2–48 characters." }, { status: 400 });
  }

  const groupId = typeof body?.groupId === "string" && GROUP_IDS.has(body.groupId) ? body.groupId : null;

  if (await labelAlreadyOnSite(label)) {
    return NextResponse.json({ error: "That instrument is already on the site." }, { status: 409 });
  }

  const existing = await db.instrumentSuggestion.findFirst({
    where: { userId, status: "PENDING", label: { equals: label, mode: "insensitive" } },
    select: { id: true, label: true, status: true },
  });
  if (existing) {
    return NextResponse.json({ suggestion: existing, already: true });
  }

  const suggestion = await db.instrumentSuggestion.create({
    data: { label, groupId, userId },
    select: { id: true, label: true, status: true },
  });

  return NextResponse.json({ suggestion, already: false });
}
