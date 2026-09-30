import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

const MAX_KEYS = 30;
const MAX_VALUE_LENGTH = 40;

function cleanAvatar(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || entries.length > MAX_KEYS) return null;
  const out: Record<string, string> = {};
  for (const [key, v] of entries) {
    if (!/^[a-zA-Z]{1,24}$/.test(key)) return null;
    if (typeof v !== "string" || v.length > MAX_VALUE_LENGTH || !/^[#a-zA-Z0-9_-]*$/.test(v)) return null;
    out[key] = v;
  }
  return out;
}

// PUT /api/settings/avatar { avatar: {...} | null }
export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !("avatar" in body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let avatar: Record<string, string> | null = null;
  if (body.avatar !== null) {
    avatar = cleanAvatar(body.avatar);
    if (!avatar) {
      return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
    }
  }

  const user = await db.user.update({
    where: { id: userId },
    data: { avatar: avatar ?? Prisma.DbNull },
    select: { avatar: true },
  });

  return NextResponse.json(user);
}
