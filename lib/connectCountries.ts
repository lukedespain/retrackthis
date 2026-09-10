/** Countries musicians can declare for payouts. */

export type PayoutCountry = {
  code: string; // ISO 3166-1 alpha-2, uppercase
  label: string;
};

/**
 * Stripe Connect transfers from a US platform only work in these regions
 * (US, CA, UK, EEA, CH). Other countries use PayPal / Wise instead.
 */
export const STRIPE_CONNECT_COUNTRIES: PayoutCountry[] = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "IE", label: "Ireland" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "CH", label: "Switzerland" },
  { code: "AT", label: "Austria" },
];

/** Full country list shown during payout setup (Stripe + PayPal/Wise). */
export const PAYOUT_COUNTRIES: PayoutCountry[] = [
  ...STRIPE_CONNECT_COUNTRIES,
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "MX", label: "Mexico" },
  { code: "BR", label: "Brazil" },
  { code: "AR", label: "Argentina" },
  { code: "CL", label: "Chile" },
  { code: "CO", label: "Colombia" },
  { code: "PE", label: "Peru" },
  { code: "UY", label: "Uruguay" },
  { code: "CR", label: "Costa Rica" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "SG", label: "Singapore" },
  { code: "HK", label: "Hong Kong" },
  { code: "IN", label: "India" },
  { code: "PH", label: "Philippines" },
  { code: "TH", label: "Thailand" },
  { code: "ZA", label: "South Africa" },
].sort((a, b) => a.label.localeCompare(b.label));

/** @deprecated Use STRIPE_CONNECT_COUNTRIES — kept for older imports. */
export const CONNECT_COUNTRIES = STRIPE_CONNECT_COUNTRIES;

export type AltPayoutProvider = "paypal" | "wise";
export type PayoutProvider = "stripe" | AltPayoutProvider;

export function normalizeConnectCountry(code: string): string {
  return code.trim().toUpperCase();
}

export function isSupportedConnectCountry(code: string): boolean {
  const normalized = normalizeConnectCountry(code);
  return STRIPE_CONNECT_COUNTRIES.some((c) => c.code === normalized);
}

export function isPayoutCountry(code: string): boolean {
  const normalized = normalizeConnectCountry(code);
  return PAYOUT_COUNTRIES.some((c) => c.code === normalized);
}

export function supportsStripeConnect(country: string): boolean {
  return isSupportedConnectCountry(country);
}

/**
 * Countries where Stripe rejects recipient stripe_transfers unless merchant
 * card_payments is also requested. Only relevant for Stripe Connect countries.
 */
const COUNTRIES_REQUIRING_MERCHANT_CARD_PAYMENTS = new Set<string>([]);

export function requiresMerchantCardPayments(country: string): boolean {
  return COUNTRIES_REQUIRING_MERCHANT_CARD_PAYMENTS.has(normalizeConnectCountry(country));
}

export function isAltPayoutProvider(value: string | null | undefined): value is AltPayoutProvider {
  return value === "paypal" || value === "wise";
}

export function formatPayoutProviderLabel(provider: string | null | undefined): string {
  if (provider === "paypal") return "PayPal";
  if (provider === "wise") return "Wise";
  if (provider === "stripe") return "Stripe";
  return "Not set";
}
