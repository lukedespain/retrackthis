/** Known instruments → emoji + soft color for JobMeta tags. */
export type InstrumentStyle = {
  emoji: string;
  className: string;
};

const INSTRUMENT_STYLES: Record<string, InstrumentStyle> = {
  "upright bass": { emoji: "🎻", className: "bg-amber-50 text-amber-800 ring-amber-600/10" },
  "double bass": { emoji: "🎻", className: "bg-amber-50 text-amber-800 ring-amber-600/10" },
  bass: { emoji: "🎸", className: "bg-orange-50 text-orange-800 ring-orange-600/10" },
  "bass guitar": { emoji: "🎸", className: "bg-orange-50 text-orange-800 ring-orange-600/10" },
  "electric bass": { emoji: "🎸", className: "bg-orange-50 text-orange-800 ring-orange-600/10" },
  guitar: { emoji: "🎸", className: "bg-rose-50 text-rose-800 ring-rose-600/10" },
  "electric guitar": { emoji: "🎸", className: "bg-rose-50 text-rose-800 ring-rose-600/10" },
  "acoustic guitar": { emoji: "🎸", className: "bg-rose-50 text-rose-800 ring-rose-600/10" },
  piano: { emoji: "🎹", className: "bg-indigo-50 text-indigo-800 ring-indigo-600/10" },
  keys: { emoji: "🎹", className: "bg-indigo-50 text-indigo-800 ring-indigo-600/10" },
  keyboard: { emoji: "🎹", className: "bg-indigo-50 text-indigo-800 ring-indigo-600/10" },
  synth: { emoji: "🎹", className: "bg-violet-50 text-violet-800 ring-violet-600/10" },
  drums: { emoji: "🥁", className: "bg-red-50 text-red-800 ring-red-600/10" },
  percussion: { emoji: "🥁", className: "bg-red-50 text-red-800 ring-red-600/10" },
  vocals: { emoji: "🎤", className: "bg-pink-50 text-pink-800 ring-pink-600/10" },
  voice: { emoji: "🎤", className: "bg-pink-50 text-pink-800 ring-pink-600/10" },
  singing: { emoji: "🎤", className: "bg-pink-50 text-pink-800 ring-pink-600/10" },
  violin: { emoji: "🎻", className: "bg-yellow-50 text-yellow-900 ring-yellow-600/10" },
  cello: { emoji: "🎻", className: "bg-yellow-50 text-yellow-900 ring-yellow-600/10" },
  viola: { emoji: "🎻", className: "bg-yellow-50 text-yellow-900 ring-yellow-600/10" },
  strings: { emoji: "🎻", className: "bg-yellow-50 text-yellow-900 ring-yellow-600/10" },
  saxophone: { emoji: "🎷", className: "bg-teal-50 text-teal-800 ring-teal-600/10" },
  sax: { emoji: "🎷", className: "bg-teal-50 text-teal-800 ring-teal-600/10" },
  trumpet: { emoji: "🎺", className: "bg-sky-50 text-sky-800 ring-sky-600/10" },
  trombone: { emoji: "🎺", className: "bg-sky-50 text-sky-800 ring-sky-600/10" },
  horn: { emoji: "🎺", className: "bg-sky-50 text-sky-800 ring-sky-600/10" },
  flute: { emoji: "🪈", className: "bg-cyan-50 text-cyan-800 ring-cyan-600/10" },
  clarinet: { emoji: "🎵", className: "bg-cyan-50 text-cyan-800 ring-cyan-600/10" },
  harmonica: { emoji: "🎵", className: "bg-lime-50 text-lime-800 ring-lime-600/10" },
  banjo: { emoji: "🪕", className: "bg-amber-50 text-amber-900 ring-amber-600/10" },
  mandolin: { emoji: "🪕", className: "bg-amber-50 text-amber-900 ring-amber-600/10" },
  ukulele: { emoji: "🪕", className: "bg-amber-50 text-amber-900 ring-amber-600/10" },
};

const FALLBACK: InstrumentStyle = {
  emoji: "🎵",
  className: "bg-gray-100 text-gray-700 ring-gray-500/10",
};

export function styleForInstrument(instrument: string): InstrumentStyle {
  const key = instrument.trim().toLowerCase();
  if (INSTRUMENT_STYLES[key]) return INSTRUMENT_STYLES[key];

  // Partial match: "Upright Bass" → check if any known key is contained
  for (const [name, style] of Object.entries(INSTRUMENT_STYLES)) {
    if (key.includes(name) || name.includes(key)) return style;
  }
  return FALLBACK;
}
