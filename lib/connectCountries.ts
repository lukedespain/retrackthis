/** Countries we allow when creating a musician Connect Express account. */

export type ConnectCountry = {
  code: string; // ISO 3166-1 alpha-2, uppercase
  label: string;
};

/**
 * US platform → connected accounts in these countries (Stripe Connect recipient list).
 * Keep focused on places musicians actually play from for Retrack This.
 */
export const CONNECT_COUNTRIES: ConnectCountry[] = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
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
];

export function isSupportedConnectCountry(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  return CONNECT_COUNTRIES.some((c) => c.code === normalized);
}

export function normalizeConnectCountry(code: string): string {
  return code.trim().toUpperCase();
}
