/** Known instruments → soft color for JobMeta tags (no per-instrument emoji). */
export type InstrumentStyle = {
  className: string;
};

const INSTRUMENT_STYLES: Record<string, InstrumentStyle> = {
  "upright bass": { className: "bg-amber-50 text-amber-800 ring-amber-600/10" },
  "double bass": { className: "bg-amber-50 text-amber-800 ring-amber-600/10" },
  bass: { className: "bg-orange-50 text-orange-800 ring-orange-600/10" },
  "bass guitar": { className: "bg-orange-50 text-orange-800 ring-orange-600/10" },
  "electric bass": { className: "bg-orange-50 text-orange-800 ring-orange-600/10" },
  guitar: { className: "bg-rose-50 text-rose-800 ring-rose-600/10" },
  "electric guitar": { className: "bg-rose-50 text-rose-800 ring-rose-600/10" },
  "acoustic guitar": { className: "bg-rose-50 text-rose-800 ring-rose-600/10" },
  piano: { className: "bg-indigo-50 text-indigo-800 ring-indigo-600/10" },
  keys: { className: "bg-indigo-50 text-indigo-800 ring-indigo-600/10" },
  keyboard: { className: "bg-indigo-50 text-indigo-800 ring-indigo-600/10" },
  synth: { className: "bg-violet-50 text-violet-800 ring-violet-600/10" },
  drums: { className: "bg-red-50 text-red-800 ring-red-600/10" },
  percussion: { className: "bg-red-50 text-red-800 ring-red-600/10" },
  vocals: { className: "bg-pink-50 text-pink-800 ring-pink-600/10" },
  vocal: { className: "bg-pink-50 text-pink-800 ring-pink-600/10" },
  voice: { className: "bg-pink-50 text-pink-800 ring-pink-600/10" },
  singing: { className: "bg-pink-50 text-pink-800 ring-pink-600/10" },
  violin: { className: "bg-yellow-50 text-yellow-900 ring-yellow-600/10" },
  cello: { className: "bg-yellow-50 text-yellow-900 ring-yellow-600/10" },
  viola: { className: "bg-yellow-50 text-yellow-900 ring-yellow-600/10" },
  strings: { className: "bg-yellow-50 text-yellow-900 ring-yellow-600/10" },
  saxophone: { className: "bg-teal-50 text-teal-800 ring-teal-600/10" },
  sax: { className: "bg-teal-50 text-teal-800 ring-teal-600/10" },
  trumpet: { className: "bg-sky-50 text-sky-800 ring-sky-600/10" },
  trombone: { className: "bg-sky-50 text-sky-800 ring-sky-600/10" },
  horn: { className: "bg-sky-50 text-sky-800 ring-sky-600/10" },
  flute: { className: "bg-cyan-50 text-cyan-800 ring-cyan-600/10" },
  clarinet: { className: "bg-cyan-50 text-cyan-800 ring-cyan-600/10" },
  harmonica: { className: "bg-lime-50 text-lime-800 ring-lime-600/10" },
  banjo: { className: "bg-amber-50 text-amber-900 ring-amber-600/10" },
  mandolin: { className: "bg-amber-50 text-amber-900 ring-amber-600/10" },
  ukulele: { className: "bg-amber-50 text-amber-900 ring-amber-600/10" },
};

const FALLBACK: InstrumentStyle = {
  className: "bg-gray-100 text-gray-700 ring-gray-500/10",
};

export function styleForInstrument(instrument: string): InstrumentStyle {
  const key = instrument.trim().toLowerCase();
  if (INSTRUMENT_STYLES[key]) return INSTRUMENT_STYLES[key];

  for (const [name, style] of Object.entries(INSTRUMENT_STYLES)) {
    if (key.includes(name) || name.includes(key)) return style;
  }
  return FALLBACK;
}
