import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { getConnectReadiness } from "@/lib/stripeConnect";

/**
 * POST /api/admin/members/:userId/reset-payouts
 * Clears stripeAccountId so the musician can onboard again with the correct country.
 * Blocked if Connect is already fully ready (avoid wiping live payout destinations).
 * Body: { force?: boolean } — force=true clears even when ready (admin override).
 */
export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const userId = params.userId;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const force = Boolean(body.force);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, stripeAccountId: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!user.stripeAccountId) {
    return NextResponse.json({
      ok: true,
      cleared: false,
      message: "No Stripe account linked.",
    });
  }

  if (!force) {
    try {
      const { ready } = await getConnectReadiness(user.stripeAccountId);
      if (ready) {
        return NextResponse.json(
          {
            error:
              "Payouts are already ready. Pass force:true only if you’re sure you need to unlink.",
          },
          { status: 400 }
        );
      }
    } catch {
      // If Stripe can’t load the account, still allow clear (orphaned / wrong env).
    }
  }

  const previousAccountId = user.stripeAccountId;
  await db.user.update({
    where: { id: user.id },
    data: { stripeAccountId: null },
  });

  return NextResponse.json({
    ok: true,
    cleared: true,
    previousAccountId,
    name: user.name,
    email: user.email,
    message:
      "Unlinked Stripe account. Musician can set up payouts again and choose their country. Reject/delete the old Express account in Stripe Dashboard if needed.",
  });
}
