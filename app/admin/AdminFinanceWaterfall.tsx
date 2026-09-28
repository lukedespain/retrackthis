"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import type { FinanceBreakdown } from "@/lib/adminFinance";

type Period = "7d" | "30d" | "90d" | "all";

function money(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(cents) / 100);
}

function signedMoney(cents: number) {
  return cents < 0 ? `−${money(cents)}` : money(cents);
}

type Step = {
  key: string;
  label: string;
  cents: number;
  color: string;
  detail?: string;
};

export function AdminFinanceWaterfall({ period }: { period: Period }) {
  const [data, setData] = useState<FinanceBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`/api/admin/finance?period=${period}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `Could not load (${res.status})`);
        if (!cancelled) setData(body);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load");
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Where the money went
        </p>
        {data?.mode === "test" && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800">
            Stripe test mode
          </span>
        )}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : !data ? (
        <div className="flex justify-center py-10">
          <Spinner size="sm" />
        </div>
      ) : data.grossCents === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No Stripe charges in this period.</p>
      ) : (
        <Breakdown data={data} />
      )}
    </div>
  );
}

function Breakdown({ data }: { data: FinanceBreakdown }) {
  const payouts = data.musicianPayouts;
  const payoutDetail = [
    payouts.stripeTransfersCents ? `${money(payouts.stripeTransfersCents)} Stripe Connect` : null,
    payouts.manualPaidCents ? `${money(payouts.manualPaidCents)} PayPal/Wise sent` : null,
    payouts.manualPendingCents
      ? `${money(payouts.manualPendingCents)} owed, not sent yet (${payouts.manualPendingCount})`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const deductions: Step[] = [
    { key: "refunds", label: "Refunds", cents: data.refundsCents, color: "bg-gray-400" },
    {
      key: "processing",
      label: "Stripe processing fees",
      cents: data.processingFeesCents,
      color: "bg-amber-400",
      detail: "Card fees on charges and refunds",
    },
    {
      key: "payouts",
      label: "Musician payouts",
      cents: payouts.totalCents,
      color: "bg-sky-500",
      detail: payoutDetail || undefined,
    },
    {
      key: "connect",
      label: "Stripe Connect fees",
      cents: data.connectFeesCents,
      color: "bg-orange-500",
      detail: "Active accounts + per-payout fees",
    },
    {
      key: "held",
      label: "Held for open jobs",
      cents: data.heldForOpenJobsCents,
      color: "bg-slate-300 dark:bg-slate-600",
      detail: "Paid upfront, not picked yet. Mostly goes to musicians later.",
    },
    {
      key: "other",
      label: "Other Stripe fees & adjustments",
      cents: data.otherStripeCents,
      color: "bg-rose-400",
    },
  ].filter((s) => s.cents !== 0);

  const net = data.netRevenueCents;
  const scale = Math.max(1, data.grossCents);
  const pct = (cents: number) => `${Math.max(0, Math.min(100, (cents / scale) * 100))}%`;
  const share = (cents: number) =>
    `${cents < 0 ? "−" : ""}${Math.abs((cents / scale) * 100).toFixed(1)}%`;

  let running = data.grossCents;
  const rows = deductions.map((step) => {
    const end = running;
    running -= step.cents;
    return { ...step, left: Math.min(running, end), width: Math.abs(step.cents) };
  });

  return (
    <div className="mt-4 space-y-5">
      <div>
        <div className="flex h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          {deductions
            .filter((s) => s.cents > 0)
            .map((s) => (
              <div
                key={s.key}
                className={s.color}
                style={{ width: pct(s.cents) }}
                title={`${s.label}: ${signedMoney(s.cents)}`}
              />
            ))}
          {net > 0 && (
            <div
              className="bg-emerald-500"
              style={{ width: pct(net) }}
              title={`Net platform revenue: ${signedMoney(net)}`}
            />
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Every dollar producers paid in this period, split by where it went.
        </p>
      </div>

      <ul className="space-y-2.5">
        <WaterfallRow
          label="Gross volume"
          detail="Collected from producers"
          cents={data.grossCents}
          share="100%"
          color="bg-accent"
          left="0%"
          width="100%"
        />
        {rows.map((row) => (
          <WaterfallRow
            key={row.key}
            label={row.label}
            detail={row.detail}
            cents={-row.cents}
            credit={row.cents < 0}
            share={share(row.cents)}
            color={row.color}
            left={pct(row.left)}
            width={pct(row.width)}
          />
        ))}
        <WaterfallRow
          label="Net platform revenue"
          detail="What’s actually ours to withdraw"
          cents={net}
          share={share(net)}
          color={net >= 0 ? "bg-emerald-500" : "bg-red-500"}
          left="0%"
          width={pct(Math.abs(net))}
          emphasize
        />
      </ul>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <span>
          10% fee on picked jobs: {money(data.expectedPlatformFeeCents)} gross vs{" "}
          {signedMoney(net)} net
        </span>
        <span>Withdrawn to bank: {signedMoney(data.withdrawnToBankCents)}</span>
        <span>{data.transactionCount} Stripe transactions</span>
      </div>
    </div>
  );
}

function WaterfallRow({
  label,
  detail,
  cents,
  share,
  color,
  left,
  width,
  credit = false,
  emphasize = false,
}: {
  label: string;
  detail?: string;
  cents: number;
  credit?: boolean;
  share: string;
  color: string;
  left: string;
  width: string;
  emphasize?: boolean;
}) {
  return (
    <li className="grid grid-cols-1 gap-1.5 sm:grid-cols-[14rem_1fr_7rem] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p
          className={`text-sm ${
            emphasize ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {label}
        </p>
        {detail && <p className="truncate text-[11px] text-gray-400" title={detail}>{detail}</p>}
      </div>
      <div className="relative h-3 rounded-full bg-gray-50 dark:bg-gray-900">
        <div
          className={`absolute inset-y-0 rounded-full ${color}`}
          style={{ left, width, minWidth: "2px" }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-2 sm:block sm:text-right">
        <p
          className={`tabular-nums text-sm ${
            emphasize ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {credit ? `+${money(cents)}` : signedMoney(cents)}
        </p>
        <p className="tabular-nums text-[11px] text-gray-400">{share}</p>
      </div>
    </li>
  );
}
