import { NextRequest, NextResponse } from "next/server";
import { cleanAvatar } from "@/lib/avatar";
import { db } from "@/lib/db";
import { POLL_INTERVAL_S, newPluginToken, sha256 } from "@/lib/pluginAuth";

// POST /api/plugin/auth/token { deviceCode } — plugin checks in.
// { status: "pending" | "slow_down" | "denied" | "expired" }, or once approved
// { status: "approved", token, user } exactly one time.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const deviceCode = typeof body?.deviceCode === "string" ? body.deviceCode : "";
  if (!deviceCode) return NextResponse.json({ error: "Missing deviceCode" }, { status: 400 });

  const request = await db.pluginDeviceAuth.findUnique({ where: { deviceCodeHash: sha256(deviceCode) } });
  if (!request || request.status === "used") return NextResponse.json({ status: "expired" }, { status: 400 });
  const now = new Date();
  if (request.expiresAt < now) return NextResponse.json({ status: "expired" }, { status: 400 });
  if (request.status === "denied") return NextResponse.json({ status: "denied" }, { status: 400 });

  // Polling faster than the interval gets told to slow down.
  if (request.lastPolledAt && now.getTime() - request.lastPolledAt.getTime() < (POLL_INTERVAL_S - 1) * 1000) {
    return NextResponse.json({ status: "slow_down", interval: POLL_INTERVAL_S + 5 });
  }

  if (request.status !== "approved" || !request.userId) {
    await db.pluginDeviceAuth.update({ where: { id: request.id }, data: { lastPolledAt: now } });
    return NextResponse.json({ status: "pending" });
  }

  // Approved: mark used first (only one caller wins), then issue the token.
  const claimed = await db.pluginDeviceAuth.updateMany({
    where: { id: request.id, status: "approved" },
    data: { status: "used", lastPolledAt: now },
  });
  if (claimed.count !== 1) return NextResponse.json({ status: "expired" }, { status: 400 });

  const token = newPluginToken();
  await db.pluginToken.create({
    data: { userId: request.userId, tokenHash: sha256(token), clientName: request.clientName },
  });
  const user = await db.user.findUnique({ where: { id: request.userId }, select: { name: true, avatar: true } });
  return NextResponse.json({
    status: "approved",
    token,
    user: { name: user?.name ?? "", avatar: cleanAvatar(user?.avatar) },
  });
}
