import { db } from "@/lib/db";
import { isAltPayoutProvider, type PayoutProvider } from "@/lib/connectCountries";
import { getConnectReadiness } from "@/lib/stripeConnect";

export type MusicianPayoutStatus = "none" | "pending" | "ready";

export type MusicianPayoutSnapshot = {
  ready: boolean;
  status: MusicianPayoutStatus;
  provider: PayoutProvider | null;
  country: string | null;
  payoutEmail: string | null;
  payoutAccountName: string | null;
  stripeAccountId: string | null;
};

type UserPayoutFields = {
  stripeAccountId: string | null;
  payoutCountry: string | null;
  payoutProvider: string | null;
  payoutEmail: string | null;
  payoutAccountName: string | null;
};

function altReady(user: UserPayoutFields): boolean {
  return (
    isAltPayoutProvider(user.payoutProvider) &&
    Boolean(user.payoutEmail?.trim()) &&
    Boolean(user.payoutAccountName?.trim()) &&
    Boolean(user.payoutCountry?.trim())
  );
}

export async function getMusicianPayoutSnapshot(userId: string): Promise<MusicianPayoutSnapshot> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      stripeAccountId: true,
      payoutCountry: true,
      payoutProvider: true,
      payoutEmail: true,
      payoutAccountName: true,
    },
  });

  if (!user) {
    return {
      ready: false,
      status: "none",
      provider: null,
      country: null,
      payoutEmail: null,
      payoutAccountName: null,
      stripeAccountId: null,
    };
  }

  if (altReady(user)) {
    return {
      ready: true,
      status: "ready",
      provider: user.payoutProvider as PayoutProvider,
      country: user.payoutCountry,
      payoutEmail: user.payoutEmail,
      payoutAccountName: user.payoutAccountName,
      stripeAccountId: user.stripeAccountId,
    };
  }

  if (user.stripeAccountId) {
    try {
      const { ready } = await getConnectReadiness(user.stripeAccountId);
      return {
        ready,
        status: ready ? "ready" : "pending",
        provider: "stripe",
        country: user.payoutCountry,
        payoutEmail: null,
        payoutAccountName: null,
        stripeAccountId: user.stripeAccountId,
      };
    } catch (err) {
      console.error("[musicianPayouts] connect readiness", err);
      return {
        ready: false,
        status: "pending",
        provider: "stripe",
        country: user.payoutCountry,
        payoutEmail: null,
        payoutAccountName: null,
        stripeAccountId: user.stripeAccountId,
      };
    }
  }

  return {
    ready: false,
    status: "none",
    provider: isAltPayoutProvider(user.payoutProvider) ? user.payoutProvider : null,
    country: user.payoutCountry,
    payoutEmail: user.payoutEmail,
    payoutAccountName: user.payoutAccountName,
    stripeAccountId: null,
  };
}

export function hasPayoutSetup(user: {
  stripeAccountId?: string | null;
  payoutProvider?: string | null;
  payoutEmail?: string | null;
  payoutAccountName?: string | null;
}): boolean {
  if (user.stripeAccountId) return true;
  return (
    isAltPayoutProvider(user.payoutProvider) &&
    Boolean(user.payoutEmail?.trim()) &&
    Boolean(user.payoutAccountName?.trim())
  );
}
