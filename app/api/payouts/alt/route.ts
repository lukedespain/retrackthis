import { NextResponse } from "next/server";
import {
  isAltPayoutProvider,
  isPayoutCountry,
  normalizeConnectCountry,
  supportsStripeConnect,
} from "@/lib/connectCountries";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// POST /api/payouts/alt
// Save PayPal or Wise payout details for countries without Stripe Connect transfers.
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    country?: string;
    provider?: string;
    email?: string;
    accountName?: string;
  };

  const countryRaw = typeof body.country === "string" ? body.country : "";
  const providerRaw = typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const accountName = typeof body.accountName === "string" ? body.accountName.trim() : "";

  if (!countryRaw.trim() || !isPayoutCountry(countryRaw)) {
    return NextResponse.json({ error: "Choose a valid payout country." }, { status: 400 });
  }
  const country = normalizeConnectCountry(countryRaw);

  if (supportsStripeConnect(country)) {
    return NextResponse.json(
      {
        error:
          "Stripe payouts are available in your country. Use Stripe setup instead of PayPal or Wise.",
      },
      { status: 400 }
    );
  }

  if (!isAltPayoutProvider(providerRaw)) {
    return NextResponse.json({ error: "Choose PayPal or Wise." }, { status: 400 });
  }
  if (!email || !looksLikeEmail(email)) {
    return NextResponse.json(
      { error: `Enter a valid ${providerRaw === "paypal" ? "PayPal" : "Wise"} email.` },
      { status: 400 }
    );
  }
  if (!accountName || accountName.length < 2) {
    return NextResponse.json(
      { error: "Enter the name on your PayPal or Wise account." },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: userId },
    data: {
      payoutCountry: country,
      payoutProvider: providerRaw,
      payoutEmail: email,
      payoutAccountName: accountName,
      // Clear any failed / half-finished Connect link so status is unambiguous.
      stripeAccountId: null,
    },
  });

  return NextResponse.json({
    ready: true,
    status: "ready",
    provider: providerRaw,
    country,
    payoutEmail: email,
    payoutAccountName: accountName,
  });
}
