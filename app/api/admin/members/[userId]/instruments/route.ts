import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { labelForInstrumentId, sanitizeInstrumentIds } from "@/lib/instruments";

// PATCH /api/admin/members/:userId/instruments
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const userId = params.userId;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const instruments = sanitizeInstrumentIds(body.instruments);

  const user = await db.user.update({
    where: { id: userId },
    data: { instruments },
    select: { id: true, instruments: true },
  });

  return NextResponse.json({
    id: user.id,
    instruments: user.instruments.map((id) => ({
      id,
      label: labelForInstrumentId(id),
    })),
  });
}
