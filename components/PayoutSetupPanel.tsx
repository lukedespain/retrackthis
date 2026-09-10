"use client";

import { useEffect, useState } from "react";
import { PayoutCountrySelect } from "@/components/ConnectCountrySelect";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  supportsStripeConnect,
  formatPayoutProviderLabel,
  type AltPayoutProvider,
  type PayoutProvider,
} from "@/lib/connectCountries";

export type PayoutStatus = "none" | "pending" | "ready";

export type PayoutSnapshot = {
  ready: boolean;
  status: PayoutStatus;
  provider: PayoutProvider | null;
  country: string | null;
  payoutEmail: string | null;
  payoutAccountName: string | null;
};

type Props = {
  snapshot: PayoutSnapshot | null;
  loading?: boolean;
  error?: string | null;
  justReturned?: boolean;
  onRefresh: () => Promise<void> | void;
  onError: (message: string | null) => void;
  onReady: (snapshot: PayoutSnapshot) => void;
  idPrefix?: string;
};

export function PayoutSetupPanel({
  snapshot,
  loading = false,
  error = null,
  justReturned = false,
  onRefresh,
  onError,
  onReady,
  idPrefix = "payout",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState("");
  const [altProvider, setAltProvider] = useState<AltPayoutProvider>("paypal");
  const [altEmail, setAltEmail] = useState("");
  const [altName, setAltName] = useState("");

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.country) setCountry(snapshot.country);
    if (snapshot.provider === "paypal" || snapshot.provider === "wise") {
      setAltProvider(snapshot.provider);
    }
    if (snapshot.payoutEmail) setAltEmail(snapshot.payoutEmail);
    if (snapshot.payoutAccountName) setAltName(snapshot.payoutAccountName);
  }, [snapshot]);

  const status = snapshot?.status ?? "none";
  const useStripe = country ? supportsStripeConnect(country) : null;

  async function startStripe(opts?: { reset?: boolean }) {
    setBusy(true);
    onError(null);
    try {
      const needsCountry = status === "none" || opts?.reset;
      if (needsCountry && !country) {
        throw new Error("Choose your payout country first.");
      }
      if (needsCountry && country && !supportsStripeConnect(country)) {
        throw new Error("Stripe isn’t available for that country. Choose PayPal or Wise below.");
      }

      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: needsCountry ? country : undefined,
          reset: opts?.reset === true,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not start payout setup");

      if (body.status === "ready") {
        onReady({
          ready: true,
          status: "ready",
          provider: "stripe",
          country: country || snapshot?.country || null,
          payoutEmail: null,
          payoutAccountName: null,
        });
        return;
      }
      if (!body.url) throw new Error("Stripe did not return an onboarding link");
      window.location.href = body.url;
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not start payout setup");
      setBusy(false);
    }
  }

  async function saveAltPayout() {
    setBusy(true);
    onError(null);
    try {
      if (!country) throw new Error("Choose your payout country first.");
      if (supportsStripeConnect(country)) {
        throw new Error("Stripe is available in your country — use Stripe setup instead.");
      }
      if (!altEmail.trim()) throw new Error("Enter your PayPal or Wise email.");
      if (!altName.trim()) throw new Error("Enter the name on that account.");

      const res = await fetch("/api/payouts/alt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          provider: altProvider,
          email: altEmail,
          accountName: altName,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save payout details");

      onReady({
        ready: true,
        status: "ready",
        provider: altProvider,
        country,
        payoutEmail: altEmail.trim(),
        payoutAccountName: altName.trim(),
      });
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save payout details");
    } finally {
      setBusy(false);
    }
  }

  if (snapshot === null) {
    return <p className="text-sm text-gray-500">Checking payout setup…</p>;
  }

  if (snapshot.ready) {
    const providerLabel = formatPayoutProviderLabel(snapshot.provider);
    return (
      <div>
        <p className="text-sm font-medium text-emerald-900">Payouts ready</p>
        <p className="mt-0.5 text-sm text-emerald-800/80">
          {snapshot.provider === "stripe"
            ? "When a creator picks your take, payment goes to your Stripe Express account."
            : `When a creator picks your take, we’ll pay you via ${providerLabel}${
                snapshot.payoutEmail ? ` (${snapshot.payoutEmail})` : ""
              }.`}
        </p>
        {justReturned && (
          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-emerald-700">
            Setup complete
          </p>
        )}
      </div>
    );
  }

  const disabled = busy || loading;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-900">
          {status === "pending" ? "Finish payout setup" : "Set up payouts"}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Choose where you get paid. Stripe is fastest where it’s available; otherwise use PayPal or
          Wise.
        </p>
        {justReturned && status === "pending" && (
          <p className="mt-2 text-sm text-amber-700">
            Stripe still needs a bit more info. Continue setup to finish.
          </p>
        )}
      </div>

      <PayoutCountrySelect
        value={country}
        onChange={setCountry}
        disabled={disabled}
        id={`${idPrefix}-country`}
      />

      {status === "pending" && snapshot.provider === "stripe" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            size="sm"
            onClick={() => void startStripe()}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            {busy ? "Opening Stripe…" : "Continue Stripe setup"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void startStripe({ reset: true })}
            disabled={disabled || !country || !supportsStripeConnect(country)}
            className="w-full sm:w-auto"
          >
            Start over with this country
          </Button>
        </div>
      ) : null}

      {status !== "pending" && useStripe === true ? (
        <Button
          type="button"
          size="sm"
          onClick={() => void startStripe()}
          disabled={disabled || !country}
          className="w-full sm:w-auto"
        >
          {busy ? "Opening Stripe…" : "Continue with Stripe"}
        </Button>
      ) : null}

      {status !== "pending" && useStripe === false ? (
        <div className="space-y-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-4">
          <p className="text-sm text-gray-700">
            Stripe can’t send Connect payouts to this country yet. Add PayPal or Wise so you can
            submit takes — we’ll pay that way if you win.
          </p>

          <div className="flex gap-2">
            {(["paypal", "wise"] as const).map((p) => {
              const selected = altProvider === p;
              return (
                <button
                  key={p}
                  type="button"
                  disabled={disabled}
                  onClick={() => setAltProvider(p)}
                  className={`min-h-10 flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all ${
                    selected
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p === "paypal" ? "PayPal" : "Wise"}
                </button>
              );
            })}
          </div>

          <Input
            id={`${idPrefix}-alt-email`}
            label={`${altProvider === "paypal" ? "PayPal" : "Wise"} email`}
            type="email"
            autoComplete="email"
            value={altEmail}
            disabled={disabled}
            onChange={(e) => setAltEmail(e.target.value)}
            placeholder="you@email.com"
            hint="Use the email on your PayPal or Wise account."
          />
          <Input
            id={`${idPrefix}-alt-name`}
            label="Name on that account"
            value={altName}
            disabled={disabled}
            onChange={(e) => setAltName(e.target.value)}
            placeholder="Full name"
            hint="Must match the name on PayPal or Wise."
          />

          <Button
            type="button"
            size="sm"
            onClick={() => void saveAltPayout()}
            disabled={disabled || !altEmail.trim() || !altName.trim()}
            className="w-full sm:w-auto"
          >
            {busy ? "Saving…" : "Save payout details"}
          </Button>
        </div>
      ) : null}

      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : null}
    </div>
  );
}
