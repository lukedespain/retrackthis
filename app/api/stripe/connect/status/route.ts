import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConnectReadiness, type ConnectStatus } from "@/lib/stripeConnect";
import { getSessionUserId } from "@/lib/supabaseServer";

// GET /api/stripe/connect/status
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeAccountId: true },
  });
  if (!user) {
    return NextResponse.json({ status: "none" satisfies ConnectStatus, ready: false });
  }

  if (!user.stripeAccountId) {
    return NextResponse.json({ status: "none" satisfies ConnectStatus, ready: false });
  }

  try {
    const { ready } = await getConnectReadiness(user.stripeAccountId);
    const status: ConnectStatus = ready ? "ready" : "pending";
    return NextResponse.json({
      status,
      ready,
      accountId: user.stripeAccountId,
    });
  } catch (err) {
    console.error("[connect/status]", err);
    return NextResponse.json({
      status: "pending" satisfies ConnectStatus,
      ready: false,
      accountId: user.stripeAccountId,
    });
  }
}
