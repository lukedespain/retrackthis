"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function MarkPaidDialog({
  job,
  payout,
  onClose,
  onPaid,
}: {
  job: { id: string; title: string };
  payout: {
    providerLabel: string;
    payoutCents: number;
    payoutAccountName: string | null;
    musicianName: string;
    payoutEmail: string | null;
  };
  onClose: () => void;
  onPaid: () => void;
}) {
  const [amount, setAmount] = useState((payout.payoutCents / 100).toFixed(2));
  const [transactionId, setTransactionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function submit() {
    const sentCents = Math.round(Number(amount.replace(/[$,\s]/g, "")) * 100);
    if (!Number.isFinite(sentCents) || sentCents < 1) {
      setError("Enter the amount you sent.");
      return;
    }
    if (!transactionId.trim()) {
      setError(`Enter the ${payout.providerLabel} transaction ID.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/complete-payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markOnly: true, sentCents, transactionId: transactionId.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6"
      role="presentation"
      onClick={(e) => {
        e.stopPropagation();
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mark-paid-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 text-left shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="mark-paid-title" className="text-base font-semibold text-gray-900">
          Mark paid
        </h2>
        <p className="mt-1 text-sm text-gray-500">{job.title}</p>

        <dl className="mt-4 space-y-1.5 rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Sent to</dt>
            <dd className="min-w-0 text-right text-gray-700">
              {payout.payoutAccountName ?? payout.musicianName}
              {payout.payoutEmail ? (
                <span className="block truncate text-xs text-gray-500">{payout.payoutEmail}</span>
              ) : null}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Via</dt>
            <dd className="text-right text-gray-700">{payout.providerLabel}</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-3">
          <Input
            label={`Amount sent through ${payout.providerLabel} (USD)`}
            name="mark-paid-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={saving}
          />
          <Input
            label={`${payout.providerLabel} transaction ID`}
            name="mark-paid-transaction"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            disabled={saving}
            placeholder="From the payment receipt"
            autoFocus
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : "Mark paid"}
          </Button>
        </div>
      </div>
    </div>
  );
}
