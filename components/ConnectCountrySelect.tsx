"use client";

import { CONNECT_COUNTRIES } from "@/lib/connectCountries";

export function ConnectCountrySelect({
  value,
  onChange,
  disabled = false,
  id = "connect-country",
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  id?: string;
}) {
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
        {CONNECT_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
        Use the country where your bank account is based. Stripe locks this when the account is
        created — it can’t be changed later.
      </p>
    </div>
  );
}
