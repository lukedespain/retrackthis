/** Canonical instrument categories for browse chips and job-alert filters. */
export type InstrumentCategory = {
  id: string;
  label: string;
  emoji: string;
  aliases: string[];
};

export const ALL_INSTRUMENTS_ID = "all";

export const INSTRUMENT_CATEGORIES: InstrumentCategory[] = [
  { id: "vocals", label: "Vocals", emoji: "🎤", aliases: ["vocal", "voice", "singing", "singer"] },
  { id: "guitar", label: "Guitar", emoji: "🎸", aliases: ["guitar"] },
  {
    id: "bass",
    label: "Bass",
    emoji: "🎸",
    aliases: ["bass guitar", "electric bass", "slap bass"],
  },
  {
    id: "upright-bass",
    label: "Upright Bass",
    emoji: "🎻",
    aliases: ["upright bass", "double bass", "upright"],
  },
  {
    id: "keys",
    label: "Piano / Keys",
    emoji: "🎹",
    aliases: ["piano", "keys", "keyboard", "rhodes", "organ"],
  },
  { id: "drums", label: "Drums", emoji: "🥁", aliases: ["drum", "percussion", "kit"] },
  {
    id: "strings",
    label: "Strings",
    emoji: "🎻",
    aliases: ["violin", "viola", "cello", "strings"],
  },
  { id: "sax", label: "Saxophone", emoji: "🎷", aliases: ["sax"] },
  { id: "brass", label: "Brass", emoji: "🎺", aliases: ["trumpet", "trombone", "horn", "brass"] },
  {
    id: "woodwinds",
    label: "Woodwinds",
    emoji: "🪈",
    aliases: ["flute", "clarinet", "woodwind", "oboe"],
  },
  { id: "synth", label: "Synth", emoji: "🎛️", aliases: ["synth", "synthesizer"] },
  { id: "banjo", label: "Banjo / Uke", emoji: "🪕", aliases: ["banjo", "ukulele", "uke", "mandolin"] },
  { id: "other", label: "Other", emoji: "🎵", aliases: [] },
];

const FALLBACK_EMOJI = "🎵";

const CATEGORY_BY_ID = new Map(INSTRUMENT_CATEGORIES.map((c) => [c.id, c]));

export function categoryById(id: string): InstrumentCategory | undefined {
  return CATEGORY_BY_ID.get(id);
}

/**
 * Map a free-text job instrument to one category. More specific aliases
 * (upright bass) are checked before generic ones (bass).
 */
export function categoryForInstrument(instrument: string): InstrumentCategory {
  const key = instrument.trim().toLowerCase();
  if (!key) return CATEGORY_BY_ID.get("other")!;

  const ranked = [...INSTRUMENT_CATEGORIES]
    .filter((c) => c.id !== "other")
    .sort((a, b) => longestAlias(b) - longestAlias(a));

  for (const category of ranked) {
    if (category.aliases.some((alias) => key.includes(alias) || alias.includes(key))) {
      return category;
    }
  }

  return CATEGORY_BY_ID.get("other")!;
}

function longestAlias(category: InstrumentCategory) {
  return category.aliases.reduce((max, alias) => Math.max(max, alias.length), 0);
}

export function emojiForInstrument(instrument: string): string {
  return categoryForInstrument(instrument).emoji || FALLBACK_EMOJI;
}

export function jobMatchesAlertFilters(instrument: string, selectedIds: string[]): boolean {
  if (selectedIds.includes(ALL_INSTRUMENTS_ID)) return true;
  if (selectedIds.length === 0) return false;
  return selectedIds.includes(categoryForInstrument(instrument).id);
}
