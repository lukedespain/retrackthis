import {
  groupForInstrumentId,
  isCustomInstrumentId,
  labelForInstrumentId,
  normalizeInstrumentId,
  parseCustomInstrumentId,
} from "@/lib/instruments";

export const SLIDER_MIN_USD = 25;
export const SLIDER_MAX_USD = 500;
export const MIN_PRICE_CENTS = SLIDER_MIN_USD * 100;
export const MIN_DURATION_SECONDS = 5;
export const MAX_DURATION_SECONDS = 30 * 60; // 30 minutes
export const MAX_DEADLINE_DAYS = 7;

export type PricingBandId = "aux" | "core" | "session-heavy" | "specialist" | "topline";

/** Beginner → pro USD bands at the 3:00 reference length (softened for newer producers). */
export const BANDS_AT_3_MIN: Record<PricingBandId, { min: number; max: number }> = {
  aux: { min: 40, max: 130 },
  core: { min: 70, max: 230 },
  "session-heavy": { min: 100, max: 360 },
  specialist: { min: 120, max: 400 },
  topline: { min: 150, max: 450 },
};

const INSTRUMENT_BAND: Record<string, PricingBandId> = {
  // Aux
  shaker: "aux",
  tambourine: "aux",
  "aux-percussion": "aux",
  ocarina: "aux",
  "tin-whistle": "aux",
  harmonica: "aux",
  ukulele: "aux",
  "spoken-word": "aux",

  // Core
  "electric-guitar": "core",
  "acoustic-guitar-steel": "core",
  "acoustic-guitar-nylon": "core",
  "bass-guitar-electric": "core",
  "bass-guitar-acoustic": "core",
  synthesizer: "core",
  "rhodes-wurlitzer": "core",
  clavinet: "core",
  banjo: "core",
  mandolin: "core",
  accordion: "core",
  cajon: "core",
  congas: "core",
  bongos: "core",
  djembe: "core",
  "background-vocals": "core",

  // Session-heavy
  "drum-kit": "session-heavy",
  "piano-grand": "session-heavy",
  "piano-upright": "session-heavy",
  "hammond-organ": "session-heavy",
  mellotron: "session-heavy",
  "vocal-soprano": "session-heavy",
  "vocal-alto": "session-heavy",
  "vocal-tenor": "session-heavy",
  "vocal-bass": "session-heavy",

  // Specialist
  violin: "specialist",
  viola: "specialist",
  cello: "specialist",
  "double-bass": "specialist",
  harp: "specialist",
  trumpet: "specialist",
  flugelhorn: "specialist",
  trombone: "specialist",
  "sax-alto": "specialist",
  "sax-tenor": "specialist",
  "sax-baritone": "specialist",
  "sax-soprano": "specialist",
  flute: "specialist",
  clarinet: "specialist",
  "french-horn": "specialist",
  tuba: "specialist",
  timpani: "specialist",
  marimba: "specialist",
  vibraphone: "specialist",
  glockenspiel: "specialist",
  chimes: "specialist",
  erhu: "specialist",
  sitar: "specialist",
  bagpipes: "specialist",

  // Topline
  topliner: "topline",
};

const GROUP_DEFAULT_BAND: Record<string, PricingBandId> = {
  fretted: "core",
  keyboards: "session-heavy",
  "orchestral-strings": "specialist",
  "drums-percussion": "aux",
  horns: "specialist",
  vocals: "session-heavy",
  world: "specialist",
};

/** Short-part anchors vs the 3:00 reference. Longer parts scale linearly with length. */
const DURATION_ANCHORS: Array<{ seconds: number; mult: number }> = [
  { seconds: 8, mult: 0.4 },
  { seconds: 15, mult: 0.4 },
  { seconds: 20, mult: 0.45 },
  { seconds: 45, mult: 0.55 },
  { seconds: 90, mult: 0.75 },
  { seconds: 180, mult: 1.0 },
];

export function roundToFive(n: number): number {
  return Math.round(n / 5) * 5;
}

export function roundToTen(n: number): number {
  return Math.round(n / 10) * 10;
}

/**
 * Duration multiplier vs 180s reference.
 * Under 3:00 we ease in with the short-part curve. Past 3:00 we scale with length
 * (10:00 ≈ 3.3×, 20:00 ≈ 6.7×) so longer sessions keep getting more expensive.
 */
export function durationMultiplier(durationSeconds: number): number {
  const s = Math.max(0, durationSeconds);
  if (s <= DURATION_ANCHORS[0].seconds) return DURATION_ANCHORS[0].mult;
  if (s >= 180) return s / 180;

  for (let i = 0; i < DURATION_ANCHORS.length - 1; i++) {
    const a = DURATION_ANCHORS[i];
    const b = DURATION_ANCHORS[i + 1];
    if (s >= a.seconds && s <= b.seconds) {
      if (b.seconds === a.seconds) return b.mult;
      const t = (s - a.seconds) / (b.seconds - a.seconds);
      return a.mult + t * (b.mult - a.mult);
    }
  }
  return 1;
}

/**
 * Deadline multiplier vs a full 7-day window.
 * Tighter deadlines nudge the suggested range up (rush). Longer windows stay at baseline.
 * 7 days → 1.0×, 1 day → 1.3×.
 */
export function deadlineMultiplier(deadlineDays: number): number {
  const d = Math.min(MAX_DEADLINE_DAYS, Math.max(1, Math.round(deadlineDays)));
  if (MAX_DEADLINE_DAYS <= 1) return 1;
  const rush = (MAX_DEADLINE_DAYS - d) / (MAX_DEADLINE_DAYS - 1);
  return 1 + rush * 0.3;
}

export function pricingBandForInstrumentId(instrumentId: string | null | undefined): PricingBandId {
  if (!instrumentId) return "core";
  const id = normalizeInstrumentId(instrumentId);

  if (INSTRUMENT_BAND[id]) return INSTRUMENT_BAND[id];

  if (isCustomInstrumentId(id)) {
    const custom = parseCustomInstrumentId(id);
    if (custom) return GROUP_DEFAULT_BAND[custom.groupId] ?? "core";
  }

  const group = groupForInstrumentId(id);
  if (group) return GROUP_DEFAULT_BAND[group.id] ?? "core";

  return "core";
}

export function formatPartDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function parseMmSs(minutes: number, seconds: number): number | null {
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  const m = Math.max(0, Math.floor(minutes));
  const sec = Math.max(0, Math.floor(seconds));
  if (sec > 59) return null;
  const total = m * 60 + sec;
  if (total < MIN_DURATION_SECONDS || total > MAX_DURATION_SECONDS) return null;
  return total;
}

export type JobPriceSuggestion = {
  bandId: PricingBandId;
  /** True calculator band (can exceed the visible slider). */
  recommendedMin: number;
  recommendedMax: number;
  /** Band clipped to the visible slider for drawing the highlight. */
  displayRecommendedMin: number;
  displayRecommendedMax: number;
  exceedsSlider: boolean;
  defaultPrice: number;
  sliderMin: number;
  sliderMax: number;
  instrumentLabel: string;
  durationLabel: string;
  deadlineDays: number;
  suggestedCopy: string;
};

export function suggestJobPrice(opts: {
  instrumentId: string | null | undefined;
  durationSeconds: number;
  deadlineDays?: number | null;
}): JobPriceSuggestion {
  const durationSeconds = Math.max(MIN_DURATION_SECONDS, Math.min(MAX_DURATION_SECONDS, opts.durationSeconds));
  const days =
    opts.deadlineDays != null && Number.isFinite(opts.deadlineDays)
      ? Math.min(MAX_DEADLINE_DAYS, Math.max(1, Math.round(opts.deadlineDays)))
      : MAX_DEADLINE_DAYS;
  const bandId = pricingBandForInstrumentId(opts.instrumentId);
  const base = BANDS_AT_3_MIN[bandId];
  const mult = durationMultiplier(durationSeconds) * deadlineMultiplier(days);

  let recommendedMin = roundToTen(base.min * mult);
  let recommendedMax = roundToTen(base.max * mult);
  if (recommendedMax < recommendedMin) recommendedMax = recommendedMin;
  recommendedMin = Math.max(30, recommendedMin);
  recommendedMax = Math.max(recommendedMin + 10, recommendedMax);

  const sliderMin = SLIDER_MIN_USD;
  const sliderMax = SLIDER_MAX_USD;
  const exceedsSlider = recommendedMax > sliderMax;

  const displayRecommendedMin = Math.min(recommendedMin, sliderMax);
  const displayRecommendedMax = Math.min(recommendedMax, sliderMax);

  // When the band is wide, default toward the middle-high of the range.
  const rawDefault = roundToTen(recommendedMin + 0.45 * (recommendedMax - recommendedMin));
  const defaultPrice = Math.max(recommendedMin, Math.min(recommendedMax, rawDefault));

  const instrumentLabel = opts.instrumentId ? labelForInstrumentId(opts.instrumentId) : "this part";
  const durationLabel = formatPartDuration(durationSeconds);
  const deadlineLabel = days === 1 ? "1 day" : `${days} days`;

  const suggestedCopy = exceedsSlider
    ? `For ${instrumentLabel} at ${durationLabel} with a ${deadlineLabel} deadline, a typical range is about $${recommendedMin} to $${recommendedMax}.`
    : `For ${instrumentLabel} at ${durationLabel} with a ${deadlineLabel} deadline, a typical range is about $${recommendedMin} to $${recommendedMax}.`;

  return {
    bandId,
    recommendedMin,
    recommendedMax,
    displayRecommendedMin,
    displayRecommendedMax,
    exceedsSlider,
    defaultPrice,
    sliderMin,
    sliderMax,
    instrumentLabel,
    durationLabel,
    deadlineDays: days,
    suggestedCopy,
  };
}

export function clampJobPriceUsd(price: number, sliderMin: number, sliderMax: number): number {
  if (!Number.isFinite(price)) return sliderMin;
  return Math.min(sliderMax, Math.max(sliderMin, Math.round(price)));
}
