import { NextRequest, NextResponse } from "next/server";
import { avatarSvgFor, cleanAvatar } from "@/lib/avatar";
import { db } from "@/lib/db";
import { getPluginUserId } from "@/lib/pluginAuth";

// GET /api/plugin/me — who the plugin is signed in as (name + avatar for its header).
export async function GET(req: NextRequest) {
  const userId = await getPluginUserId(req);
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, avatar: true, isAdmin: true } });
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({
    name: user.name,
    avatar: cleanAvatar(user.avatar),
    avatarSvg: avatarSvgFor(user.avatar),
    isAdmin: user.isAdmin,
  });
}
