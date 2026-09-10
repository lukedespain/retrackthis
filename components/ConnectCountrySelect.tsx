"use client";

import { PAYOUT_COUNTRIES, supportsStripeConnect } from "@/lib/connectCountries";

export function PayoutCountrySelect({
  value,
  onChange,
  disabled = false,
  id = "payout-country",
  hint,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  id?: string;
  hint?: string;
}) {
  const stripeOk = value ? supportsStripeConnect(value) : null;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700">
        Country for payouts
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-accent/30 focus:ring-2 disabled:opacity-50"
      >
        <option value="">Select country…</option>
        {PAYOUT_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
            {supportsStripeConnect(c.code) ? "" : " · PayPal / Wise"}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
        {hint
          ? hint
          : stripeOk === null
            ? "Choose the country where you receive payments."
            : stripeOk
              ? "Stripe is available here. You’ll finish bank details on Stripe’s form."
              : "Stripe can’t pay out to this country yet. We’ll use PayPal or Wise instead."}
      </p>
    </div>
  );
}

/** @deprecated Use PayoutCountrySelect */
export function ConnectCountrySelect(props: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  return <PayoutCountrySelect {...props} />;
}
