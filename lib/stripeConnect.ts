import { stripe } from "@/lib/stripe";

const STRIPE_V2_VERSION = "2026-07-29.dahlia";

export type ConnectStatus = "none" | "pending" | "ready";

function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function connectReturnUrl() {
  return `${appBaseUrl()}/dashboard?tab=submissions&payouts=return`;
}

export function connectRefreshUrl() {
  return `${appBaseUrl()}/dashboard?tab=submissions&payouts=refresh`;
}

type V2Account = {
  id: string;
  metadata?: Record<string, string> | null;
  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          stripe_transfers?: { status?: string };
          payouts?: { status?: string };
        };
      };
    };
  };
};

async function stripeV2<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");

  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_V2_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
  } & T;

  if (!res.ok) {
    const err = new Error(json.error?.message ?? `Stripe v2 request failed (${res.status})`) as Error & {
      code?: string;
      statusCode?: number;
    };
    err.code = json.error?.code;
    err.statusCode = res.status;
    throw err;
  }

  return json as T;
}

function transfersActive(account: V2Account): boolean {
  const status =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ??
    account.configuration?.recipient?.capabilities?.stripe_balance?.payouts?.status;
  return status === "active";
}

async function createAccountV2(opts: {
  userId: string;
  email: string;
  name: string;
}): Promise<{ id: string }> {
  return stripeV2<V2Account>("POST", "/v2/core/accounts", {
    contact_email: opts.email,
    display_name: opts.name,
    dashboard: "express",
    metadata: { userId: opts.userId },
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    identity: {
      country: "us",
      entity_type: "individual",
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
    include: ["configuration.recipient", "identity", "requirements"],
  });
}

async function createAccountLinkV2(accountId: string): Promise<{ url: string }> {
  return stripeV2<{ url: string }>("POST", "/v2/core/account_links", {
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: connectRefreshUrl(),
        return_url: connectReturnUrl(),
      },
    },
  });
}

async function retrieveAccountV2(accountId: string): Promise<V2Account> {
  const params = new URLSearchParams();
  params.append("include", "configuration.recipient");
  params.append("include", "identity");
  return stripeV2<V2Account>("GET", `/v2/core/accounts/${accountId}?${params.toString()}`);
}

async function createAccountV1(opts: {
  userId: string;
  email: string;
}): Promise<{ id: string }> {
  const account = await stripe.accounts.create({
    country: "US",
    email: opts.email,
    metadata: { userId: opts.userId },
    controller: {
      fees: { payer: "application" },
      losses: { payments: "application" },
      stripe_dashboard: { type: "express" },
    },
    capabilities: {
      transfers: { requested: true },
    },
  });
  return { id: account.id };
}

async function createAccountLinkV1(accountId: string): Promise<{ url: string }> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: connectRefreshUrl(),
    return_url: connectReturnUrl(),
    type: "account_onboarding",
  });
  return { url: link.url };
}

function isV2Unavailable(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? "";
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    code === "accounts_v2_access_blocked" ||
    code === "non_connect_platform_accounts_v2_access_blocked" ||
    message.includes("accounts v2") ||
    message.includes("v2/core/accounts")
  );
}

/**
 * Create a Connect Express account for receiving transfers (musician payouts).
 * Prefers Accounts v2 (current marketplace path); falls back to v1 Express.
 */
export async function createConnectAccount(opts: {
  userId: string;
  email: string;
  name: string;
}): Promise<{ id: string; api: "v2" | "v1" }> {
  try {
    const account = await createAccountV2(opts);
    return { id: account.id, api: "v2" };
  } catch (err) {
    if (!isV2Unavailable(err)) throw err;
    const account = await createAccountV1(opts);
    return { id: account.id, api: "v1" };
  }
}

export async function createConnectOnboardingLink(accountId: string): Promise<{ url: string }> {
  try {
    return await createAccountLinkV2(accountId);
  } catch (err) {
    if (!isV2Unavailable(err)) {
      // Account may be v1-created; try classic Account Links.
      try {
        return await createAccountLinkV1(accountId);
      } catch {
        throw err;
      }
    }
    return createAccountLinkV1(accountId);
  }
}

export async function getConnectReadiness(accountId: string): Promise<{
  ready: boolean;
  api: "v2" | "v1";
}> {
  try {
    const account = await retrieveAccountV2(accountId);
    return { ready: transfersActive(account), api: "v2" };
  } catch {
    const account = await stripe.accounts.retrieve(accountId);
    const transfers =
      typeof account.capabilities?.transfers === "string"
        ? account.capabilities.transfers === "active"
        : false;
    return {
      ready: Boolean(account.payouts_enabled || transfers),
      api: "v1",
    };
  }
}

export async function assertMusicianPayoutsReady(accountId: string) {
  const { ready } = await getConnectReadiness(accountId);
  if (!ready) {
    throw new Error("Musician hasn't finished Stripe onboarding");
  }
}
