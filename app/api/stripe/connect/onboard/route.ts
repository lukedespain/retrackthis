import { NextResponse } from "next/server";
import { isSupportedConnectCountry, normalizeConnectCountry } from "@/lib/connectCountries";
import { db } from "@/lib/db";
import {
  createConnectAccount,
  createConnectOnboardingLink,
  getConnectReadiness,
} from "@/lib/stripeConnect";
import { getSessionUserId } from "@/lib/supabaseServer";

// POST /api/stripe/connect/onboard
// Creates (or resumes) Connect Express onboarding for the signed-in musician.
// Body: { country?: string, reset?: boolean }
// - New account: `country` required (ISO alpha-2). Stripe locks country at create.
// - Pending account: omit country to continue; or reset:true + country to start over.
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Complete your profile first" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    country?: string;
    reset?: boolean;
  };

  try {
    let accountId = user.stripeAccountId;

    if (accountId && body.reset) {
      const { ready } = await getConnectReadiness(accountId);
      if (ready) {
        return NextResponse.json(
          { error: "Payouts are already ready. Contact support to change country." },
          { status: 400 }
        );
      }
      await db.user.update({
        where: { id: user.id },
        data: { stripeAccountId: null },
      });
      accountId = null;
    }

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
      const countryRaw = typeof body.country === "string" ? body.country : "";
      if (!countryRaw.trim()) {
        return NextResponse.json(
          { error: "Choose the country where your bank / business is based." },
          { status: 400 }
        );
      }
      const country = normalizeConnectCountry(countryRaw);
      if (!isSupportedConnectCountry(country)) {
        return NextResponse.json(
          {
            error:
              "Stripe can’t pay out to that country. Choose PayPal or Wise for your country instead.",
            code: "STRIPE_COUNTRY_UNSUPPORTED",
          },
          { status: 400 }
        );
      }

      const created = await createConnectAccount({
        userId: user.id,
        email: user.email,
        name: user.name,
        country,
      });
      accountId = created.id;
      await db.user.update({
        where: { id: user.id },
        data: {
          stripeAccountId: accountId,
          payoutProvider: "stripe",
          payoutCountry: country,
          payoutEmail: null,
          payoutAccountName: null,
        },
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
