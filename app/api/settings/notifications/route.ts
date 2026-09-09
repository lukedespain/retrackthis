import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      notifyJobAlerts: true,
      notifyTakeSubmitted: true,
      notifyTakeOutcome: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: {
    notifyJobAlerts?: boolean;
    notifyTakeSubmitted?: boolean;
    notifyTakeOutcome?: boolean;
  } = {};

  if ("notifyJobAlerts" in body) data.notifyJobAlerts = Boolean(body.notifyJobAlerts);
  if ("notifyTakeSubmitted" in body) data.notifyTakeSubmitted = Boolean(body.notifyTakeSubmitted);
  if ("notifyTakeOutcome" in body) data.notifyTakeOutcome = Boolean(body.notifyTakeOutcome);

  const user = await db.user.update({
    where: { id: userId },
    data,
    select: {
      notifyJobAlerts: true,
      notifyTakeSubmitted: true,
      notifyTakeOutcome: true,
    },
  });

  return NextResponse.json(user);
}
