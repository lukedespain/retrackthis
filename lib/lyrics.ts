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

const SPOKEN_OUTRO =
  /\s*(thanks for watching|thank you for watching|thanks for listening|please subscribe|like and subscribe)[!?.]*\s*/gi;

/** One sentence per line, without the sign-off lines a transcriber sometimes adds. */
export function formatTranscribedLyrics(value: string): string {
  const flat = value
    .replace(/\r\n/g, " ")
    .replace(SPOKEN_OUTRO, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!flat) return "";
  const glue = /^(but|and|or|if|as|so|when|then)$/i;
  const lined = flat
    .replace(/([.!?])\s+/g, "$1\n")
    .replace(/([A-Za-z']+)\s+([A-Z])/g, (match, prev: string, next: string) =>
      glue.test(prev) ? match : `${prev}\n${next}`
    );
  return lined
    .split("\n")
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_LYRICS);
}

export function hasLyrics(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}
