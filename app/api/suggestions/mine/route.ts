import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [instruments, features] = await Promise.all([
    db.instrumentSuggestion.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, label: true, status: true, adminNote: true, createdAt: true },
    }),
    db.featureRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, details: true, status: true, adminNote: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({ instruments, features });
}
