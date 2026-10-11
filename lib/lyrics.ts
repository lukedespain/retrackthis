import { normalizeInstrumentId } from "@/lib/instruments";

const MAX_LYRICS = 12000;

export function isVocalPart(input: { instrumentId?: string | null; instrument?: string | null }): boolean {
  const id = input.instrumentId ? normalizeInstrumentId(input.instrumentId) : "";
  if (id === "vocal-male" || id === "vocal-female" || id.startsWith("vocal-")) return true;
  return /vocal/i.test(input.instrument ?? "");
}

export function cleanLyrics(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, MAX_LYRICS);
}

export function hasLyrics(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}
