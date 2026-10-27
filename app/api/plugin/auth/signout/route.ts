import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/pluginAuth";

// POST /api/plugin/auth/signout — the plugin revokes its own token.
export async function POST(req: NextRequest) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!match) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  await db.pluginToken.updateMany({
    where: { tokenHash: sha256(match[1]), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
