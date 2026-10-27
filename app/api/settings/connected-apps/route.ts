import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TOKEN_IDLE_MS } from "@/lib/pluginAuth";
import { getSessionUserId } from "@/lib/supabaseServer";

// GET /api/settings/connected-apps — the signed-in user's active DAW plugin connections.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const apps = await db.pluginToken.findMany({
    where: { userId, revokedAt: null, lastUsedAt: { gt: new Date(Date.now() - TOKEN_IDLE_MS) } },
    select: { id: true, clientName: true, createdAt: true, lastUsedAt: true },
    orderBy: { lastUsedAt: "desc" },
  });
  return NextResponse.json({ apps });
}

// DELETE /api/settings/connected-apps { id } — disconnect one (signs that plugin out).
export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const done = await db.pluginToken.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (done.count !== 1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
