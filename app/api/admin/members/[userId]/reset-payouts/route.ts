import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { getConnectReadiness } from "@/lib/stripeConnect";

/**
 * POST /api/admin/members/:userId/reset-payouts
 * Clears Stripe Connect + PayPal/Wise payout fields so the musician can set up again.
 * Blocked if Stripe Connect is already fully ready (avoid wiping live destinations),
 * unless force:true.
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
    select: {
      id: true,
      name: true,
      email: true,
      stripeAccountId: true,
      payoutProvider: true,
      payoutEmail: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const hadAnything = Boolean(user.stripeAccountId || user.payoutProvider || user.payoutEmail);
  if (!hadAnything) {
    return NextResponse.json({
      ok: true,
      cleared: false,
      message: "No payout setup on this member.",
    });
  }

  if (user.stripeAccountId && !force) {
    try {
      const { ready } = await getConnectReadiness(user.stripeAccountId);
      if (ready) {
        return NextResponse.json(
          {
            error:
              "Stripe payouts are already ready. Pass force:true only if you’re sure you need to unlink.",
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
    data: {
      stripeAccountId: null,
      payoutProvider: null,
      payoutEmail: null,
      payoutAccountName: null,
      payoutCountry: null,
    },
  });

  return NextResponse.json({
    ok: true,
    cleared: true,
    previousAccountId,
    name: user.name,
    email: user.email,
    message:
      "Cleared payout setup. Musician can set up Stripe or PayPal/Wise again.",
  });
}
