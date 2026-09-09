import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { ALL_INSTRUMENTS_ID, sanitizeInstrumentIds } from "@/lib/instruments";

function sanitizeNotifyInstruments(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  if (value.includes(ALL_INSTRUMENTS_ID)) return [ALL_INSTRUMENTS_ID];
  return sanitizeInstrumentIds(value);
}

// PATCH /api/admin/members/:userId/notifications
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

  const data: {
    notifyJobAlerts?: boolean;
    notifyInstruments?: string[];
    notifyTakeSubmitted?: boolean;
    notifyTakeOutcome?: boolean;
  } = {};

  if ("notifyJobAlerts" in body) data.notifyJobAlerts = Boolean(body.notifyJobAlerts);
  if ("notifyTakeSubmitted" in body) data.notifyTakeSubmitted = Boolean(body.notifyTakeSubmitted);
  if ("notifyTakeOutcome" in body) data.notifyTakeOutcome = Boolean(body.notifyTakeOutcome);
  if ("notifyInstruments" in body) {
    data.notifyInstruments = sanitizeNotifyInstruments(body.notifyInstruments);
  }

  if (data.notifyInstruments && data.notifyInstruments.length === 0) {
    data.notifyJobAlerts = false;
  }

  const user = await db.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      notifyJobAlerts: true,
      notifyInstruments: true,
      notifyTakeSubmitted: true,
      notifyTakeOutcome: true,
    },
  });

  return NextResponse.json(user);
}
