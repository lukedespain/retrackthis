/** Instrument → iOS-style emoji for JobMeta tags. Unknowns fall back to 🎵. */
const INSTRUMENT_EMOJIS: Record<string, string> = {
  "upright bass": "🎻",
  "double bass": "🎻",
  bass: "🎸",
  "bass guitar": "🎸",
  "electric bass": "🎸",
  guitar: "🎸",
  "electric guitar": "🎸",
  "acoustic guitar": "🎸",
  piano: "🎹",
  keys: "🎹",
  keyboard: "🎹",
  synth: "🎛️",
  drums: "🥁",
  percussion: "🥁",
  vocals: "🎤",
  vocal: "🎤",
  voice: "🎤",
  singing: "🎤",
  violin: "🎻",
  cello: "🎻",
  viola: "🎻",
  strings: "🎻",
  saxophone: "🎷",
  sax: "🎷",
  trumpet: "🎺",
  trombone: "🎺",
  horn: "🎺",
  flute: "🪈",
  clarinet: "🎼",
  harmonica: "🎵",
  banjo: "🪕",
  mandolin: "🎵",
  ukulele: "🪕",
};

const FALLBACK_EMOJI = "🎵";

export function emojiForInstrument(instrument: string): string {
  const key = instrument.trim().toLowerCase();
  if (INSTRUMENT_EMOJIS[key]) return INSTRUMENT_EMOJIS[key];

  for (const [name, emoji] of Object.entries(INSTRUMENT_EMOJIS)) {
    if (key.includes(name) || name.includes(key)) return emoji;
  }
  return FALLBACK_EMOJI;
}
