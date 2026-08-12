"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ConnectStatus = "none" | "pending" | "ready";

export function PayoutSetupCard({ highlightReturn = false }: { highlightReturn?: boolean }) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justReturned, setJustReturned] = useState(highlightReturn);

  async function loadStatus() {
    try {
      const res = await fetch("/api/stripe/connect/status");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not load payout status");
      setStatus(body.status as ConnectStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payout status");
      setStatus("none");
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (!highlightReturn) return;
    setJustReturned(true);
    loadStatus();
    const t = window.setTimeout(() => setJustReturned(false), 6000);
    return () => window.clearTimeout(t);
  }, [highlightReturn]);

  async function startOnboarding() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not start payout setup");

      if (body.status === "ready") {
        setStatus("ready");
        return;
      }
      if (!body.url) throw new Error("Stripe did not return an onboarding link");
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payout setup");
      setLoading(false);
    }
  }

  if (status === null) {
    return (
      <Card padding="md" className="border border-dashed border-gray-200 bg-white">
        <p className="text-sm text-gray-500">Checking payout setup…</p>
      </Card>
    );
  }

  if (status === "ready") {
    return (
      <Card padding="md" className="border border-emerald-100 bg-emerald-50/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-900">Payouts ready</p>
            <p className="mt-0.5 text-sm text-emerald-800/80">
              When a creator picks your take, payment goes to your Stripe Express account.
            </p>
          </div>
          {justReturned && (
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-700">
              Setup complete
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-emerald-800/70">
          Manage bank details anytime from the menu → Stripe Express.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {status === "pending" ? "Finish payout setup" : "Set up payouts"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Connect a Stripe Express account so you can get paid when a creator awards your take.
            Stripe hosts the identity and bank details form.
          </p>
          {justReturned && status === "pending" && (
            <p className="mt-2 text-sm text-amber-700">
              Stripe still needs a bit more info. Continue setup to finish.
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={startOnboarding}
          disabled={loading}
          className="w-full shrink-0 sm:w-auto"
        >
          {loading ? "Opening Stripe…" : status === "pending" ? "Continue setup" : "Set up payouts"}
        </Button>
      </div>
      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </Card>
  );
}
