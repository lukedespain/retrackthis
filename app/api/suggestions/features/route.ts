import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().replace(/\s+/g, " ") : "";
  const details = typeof body?.details === "string" ? body.details.trim() : "";
  if (title.length < 3 || title.length > 80) {
    return NextResponse.json({ error: "Give the idea a short title." }, { status: 400 });
  }
  if (details.length < 8 || details.length > 2000) {
    return NextResponse.json({ error: "Add a bit more detail, up to 2000 characters." }, { status: 400 });
  }

  const request = await db.featureRequest.create({
    data: { title, details, userId },
    select: { id: true, title: true, details: true, status: true, adminNote: true, createdAt: true },
  });

  return NextResponse.json({ request });
}
