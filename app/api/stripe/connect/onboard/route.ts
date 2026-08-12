import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createConnectAccount,
  createConnectOnboardingLink,
  getConnectReadiness,
} from "@/lib/stripeConnect";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/stripe/connect/onboard
// Creates (or resumes) Connect Express onboarding for the signed-in musician.
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }

  try {
    let accountId = user.stripeAccountId;

    if (accountId) {
      const { ready } = await getConnectReadiness(accountId);
      if (ready) {
        return NextResponse.json({
          url: null,
          status: "ready",
          accountId,
        });
      }
    } else {
      const created = await createConnectAccount({
        userId: user.id,
        email: user.email,
        name: user.name,
      });
      accountId = created.id;
      await db.user.update({
        where: { id: user.id },
        data: { stripeAccountId: accountId },
      });
    }

    const { url } = await createConnectOnboardingLink(accountId);
    return NextResponse.json({ url, status: "pending", accountId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start payout setup";
    console.error("[connect/onboard]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
