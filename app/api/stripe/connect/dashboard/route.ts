import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/stripe/connect/dashboard
// Single-use Express Dashboard login link for the signed-in musician.
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeAccountId: true },
  });

  if (!user?.stripeAccountId) {
    return NextResponse.json({ error: "Payouts are not set up yet" }, { status: 400 });
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);
    return NextResponse.json({ url: loginLink.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open Stripe Express";
    console.error("[connect/dashboard]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
