"use client";

import { useEffect, useState } from "react";
import { PayoutCountrySelect } from "@/components/ConnectCountrySelect";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  supportsStripeConnect,
  formatPayoutProviderLabel,
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
  /** When ready, show summary + edit / open Stripe controls. */
  allowManage?: boolean;
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
  allowManage = false,
  onRefresh,
  onError,
  onReady,
  idPrefix = "payout",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [country, setCountry] = useState("");
  const [provider, setProvider] = useState<PayoutProvider | "">("");
  const [altEmail, setAltEmail] = useState("");
  const [altName, setAltName] = useState("");
  const [feeAck, setFeeAck] = useState(false);

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.country) setCountry(snapshot.country);
    if (snapshot.provider) setProvider(snapshot.provider);
    if (snapshot.payoutEmail) setAltEmail(snapshot.payoutEmail);
    if (snapshot.payoutAccountName) setAltName(snapshot.payoutAccountName);
  }, [snapshot]);

  const status = snapshot?.status ?? "none";
  const stripeAvailable = country ? supportsStripeConnect(country) : false;
  const showMethods = Boolean(country) && status !== "pending";

  function handleCountryChange(code: string) {
    setCountry(code);
    setProvider("");
    setFeeAck(false);
    onError(null);
  }

  function handleProviderChange(next: PayoutProvider) {
    if (next === "stripe" && country && !supportsStripeConnect(country)) return;
    setProvider(next);
    setFeeAck(false);
    onError(null);
  }

  async function startStripe(opts?: { reset?: boolean }) {
    setBusy(true);
    onError(null);
    try {
      const needsCountry = status === "none" || opts?.reset;
      if (needsCountry && !country) {
        throw new Error("Choose your payout country first.");
      }
      if (needsCountry && country && !supportsStripeConnect(country)) {
        throw new Error("Stripe isn’t available for that country. Choose PayPal or Wise.");
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
      if (provider !== "paypal" && provider !== "wise") {
        throw new Error("Choose PayPal or Wise.");
      }
      if (!altEmail.trim()) throw new Error("Enter your PayPal or Wise email.");
      if (!altName.trim()) throw new Error("Enter the name on that account.");
      if (!feeAck) {
        throw new Error("Please confirm you’ve read the note about PayPal/Wise fees.");
      }

      const res = await fetch("/api/payouts/alt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country,
          provider,
          email: altEmail,
          accountName: altName,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save payout details");

      onReady({
        ready: true,
        status: "ready",
        provider,
        country,
        payoutEmail: altEmail.trim(),
        payoutAccountName: altName.trim(),
      });
      setEditing(false);
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save payout details");
    } finally {
      setBusy(false);
    }
  }

  async function openStripeDashboard() {
    setBusy(true);
    onError(null);
    try {
      const res = await fetch("/api/stripe/connect/dashboard", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not open Stripe");
      if (!body?.url) throw new Error("Stripe did not return a dashboard link");
      const opened = window.open(body.url, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = body.url;
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not open Stripe");
    } finally {
      setBusy(false);
    }
  }

  function startEditing() {
    setEditing(true);
    setFeeAck(false);
    onError(null);
  }

  function cancelEditing() {
    setEditing(false);
    setFeeAck(false);
    onError(null);
    if (snapshot?.country) setCountry(snapshot.country);
    if (snapshot?.provider) setProvider(snapshot.provider);
    if (snapshot?.payoutEmail) setAltEmail(snapshot.payoutEmail);
    if (snapshot?.payoutAccountName) setAltName(snapshot.payoutAccountName);
  }

  if (snapshot === null) {
    return <p className="text-sm text-gray-500">Checking payout setup…</p>;
  }

  if (snapshot.ready && !(allowManage && editing)) {
    const providerLabel = formatPayoutProviderLabel(snapshot.provider);
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-emerald-900">Payouts ready</p>
          <p className="mt-0.5 text-sm text-emerald-800/80">
            {snapshot.provider === "stripe"
              ? "When a creator picks your take, payment goes to your Stripe Express account."
              : `Paid via ${providerLabel}${
                  snapshot.payoutEmail ? ` · ${snapshot.payoutEmail}` : ""
                }${snapshot.payoutAccountName ? ` · ${snapshot.payoutAccountName}` : ""}${
                  snapshot.country ? ` · ${snapshot.country}` : ""
                }`}
          </p>
          {justReturned && (
            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-emerald-700">
              Setup complete
            </p>
          )}
        </div>
        {allowManage ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {snapshot.provider === "stripe" ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void openStripeDashboard()}
                disabled={busy || loading}
                className="w-full sm:w-auto"
              >
                {busy ? "Opening…" : "Manage in Stripe"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={startEditing}
              disabled={busy || loading}
              className="w-full sm:w-auto"
            >
              {snapshot.provider === "stripe" ? "Change payout method" : "Edit details"}
            </Button>
          </div>
        ) : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>
    );
  }

  const disabled = busy || loading;
  const methodOptions: Array<{
    id: PayoutProvider;
    label: string;
    available: boolean;
  }> = [
    { id: "stripe", label: "Stripe (recommended)", available: stripeAvailable },
    { id: "paypal", label: "PayPal", available: true },
    { id: "wise", label: "Wise", available: true },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-900">
          {status === "pending"
            ? "Finish payout setup"
            : editing
              ? "Update payout details"
              : "Set up payouts"}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {editing
            ? "Change your country or payout method. Saving PayPal/Wise replaces your current details."
            : "Pick your country, then choose how you want to get paid if a producer selects your take."}
        </p>
        {justReturned && status === "pending" && (
          <p className="mt-2 text-sm text-amber-700">
            Stripe still needs a bit more info. Continue setup to finish.
          </p>
        )}
      </div>

      <PayoutCountrySelect
        value={country}
        onChange={handleCountryChange}
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

      {showMethods ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-700">How do you want to get paid?</p>
          <div className={`grid gap-2 ${stripeAvailable ? "grid-cols-3" : "grid-cols-2"}`}>
            {methodOptions
              .filter((m) => m.available)
              .map((m) => {
                const selected = provider === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleProviderChange(m.id)}
                    className={`min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      selected
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-800 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
          </div>

          {provider === "stripe" ? (
            <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="text-sm leading-relaxed text-emerald-900/80">
                Lower fees — payment goes straight from the producer to you. You’ll finish identity
                and bank details on Stripe’s secure form.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => void startStripe()}
                disabled={disabled}
                className="w-full sm:w-auto"
              >
                {busy ? "Opening Stripe…" : "Continue with Stripe"}
              </Button>
            </div>
          ) : null}

          {provider === "paypal" || provider === "wise" ? (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
              {!stripeAvailable ? (
                <p className="text-sm text-gray-600">
                  Stripe isn’t available for payouts in this country yet. PayPal or Wise works instead.
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Prefer not to use Stripe? We can pay you through{" "}
                  {provider === "paypal" ? "PayPal" : "Wise"} if you win.
                </p>
              )}

              <Input
                id={`${idPrefix}-alt-email`}
                label={`${provider === "paypal" ? "PayPal" : "Wise"} email`}
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

              <label className="flex items-start gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-900">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-amber-300 text-accent focus:ring-accent/30"
                  checked={feeAck}
                  disabled={disabled}
                  onChange={(e) => setFeeAck(e.target.checked)}
                />
                <span>
                  I understand that PayPal and Wise sometimes take a small transfer or currency fee.
                  If they do, it’ll come out of my payout.
                </span>
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveAltPayout()}
                  disabled={disabled || !altEmail.trim() || !altName.trim() || !feeAck}
                  className="w-full sm:w-auto"
                >
                  {busy ? "Saving…" : "Save payout details"}
                </Button>
                {editing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditing}
                    disabled={disabled}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {editing && provider === "stripe" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelEditing}
              disabled={disabled}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
