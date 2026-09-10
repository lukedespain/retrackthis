"use client";

import { useEffect, useState } from "react";
import { PayoutSetupPanel, type PayoutSnapshot } from "@/components/PayoutSetupPanel";
import { Card } from "@/components/ui/Card";

export function PayoutSetupCard({ highlightReturn = false }: { highlightReturn?: boolean }) {
  const [snapshot, setSnapshot] = useState<PayoutSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justReturned, setJustReturned] = useState(highlightReturn);

  async function loadStatus() {
    try {
      const res = await fetch("/api/payouts/status");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not load payout status");
      setSnapshot(body as PayoutSnapshot);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payout status");
      setSnapshot({
        ready: false,
        status: "none",
        provider: null,
        country: null,
        payoutEmail: null,
        payoutAccountName: null,
      });
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    if (!highlightReturn) return;
    setJustReturned(true);
    void loadStatus();
    const t = window.setTimeout(() => setJustReturned(false), 6000);
    return () => window.clearTimeout(t);
  }, [highlightReturn]);

  if (snapshot === null) {
    return (
      <Card padding="md" className="border border-dashed border-gray-200 bg-white">
        <p className="text-sm text-gray-500">Checking payout setup…</p>
      </Card>
    );
  }

  return (
    <Card
      padding="md"
      className={
        snapshot.ready ? "border border-emerald-100 bg-emerald-50/60" : undefined
      }
    >
      <PayoutSetupPanel
        snapshot={snapshot}
        error={error}
        justReturned={justReturned}
        onRefresh={loadStatus}
        onError={setError}
        onReady={setSnapshot}
        idPrefix="payout-setup"
      />
      {snapshot.ready && snapshot.provider === "stripe" ? (
        <p className="mt-3 text-xs text-emerald-800/70">
          Manage bank details anytime from the menu → Payouts.
        </p>
      ) : null}
    </Card>
  );
}
