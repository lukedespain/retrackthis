/** Canonical instrument catalog — grouped accordions for pickers, flat ids for profiles & jobs. */

export type InstrumentCategory = {
  id: string;
  label: string;
  emoji: string;
  aliases: string[];
  groupId: string;
  groupLabel: string;
};

export type InstrumentGroup = {
  id: string;
  label: string;
  emoji: string;
  items: Array<{
    id: string;
    label: string;
    emoji: string;
    aliases: string[];
  }>;
};

export const ALL_INSTRUMENTS_ID = "all";
export const CUSTOM_INSTRUMENT_PREFIX = "custom:";

const CUSTOM_ID_PATTERN = /^custom:[a-z0-9-]+:[a-z0-9-]{1,48}$/;

/** Session-focused taxonomy — each item is individually selectable. */
export const INSTRUMENT_GROUPS: InstrumentGroup[] = [
  {
    id: "fretted",
    label: "Guitars & fretted strings",
    emoji: "🎸",
    items: [
      { id: "electric-guitar", label: "Electric guitar", emoji: "🎸", aliases: ["electric guitar"] },
      { id: "acoustic-guitar-steel", label: "Acoustic guitar (steel)", emoji: "🎸", aliases: ["steel string guitar", "acoustic guitar"] },
      { id: "acoustic-guitar-nylon", label: "Acoustic guitar (nylon)", emoji: "🎸", aliases: ["nylon guitar", "classical guitar"] },
      { id: "bass-guitar-electric", label: "Bass guitar (electric)", emoji: "🎸", aliases: ["electric bass", "bass guitar"] },
      { id: "bass-guitar-acoustic", label: "Bass guitar (acoustic)", emoji: "🎸", aliases: ["acoustic bass"] },
      { id: "banjo", label: "Banjo", emoji: "🪕", aliases: ["banjo", "5 string banjo"] },
      { id: "mandolin", label: "Mandolin", emoji: "🪕", aliases: ["mandolin"] },
      { id: "ukulele", label: "Ukulele", emoji: "🪕", aliases: ["ukulele", "uke"] },
    ],
  },
  {
    id: "keyboards",
    label: "Keyboards & pianos",
    emoji: "🎹",
    items: [
      { id: "piano-grand", label: "Grand piano", emoji: "🎹", aliases: ["grand piano", "piano"] },
      { id: "piano-upright", label: "Upright piano", emoji: "🎹", aliases: ["upright piano"] },
      { id: "rhodes-wurlitzer", label: "Rhodes / Wurlitzer", emoji: "🎹", aliases: ["rhodes", "wurlitzer", "electric piano", "ep"] },
      { id: "synthesizer", label: "Synthesizer", emoji: "🎛️", aliases: ["synth", "synthesizer", "modular"] },
      { id: "hammond-organ", label: "Hammond organ / Leslie", emoji: "🎹", aliases: ["organ", "hammond", "b3", "leslie"] },
      { id: "mellotron", label: "Mellotron", emoji: "🎹", aliases: ["mellotron"] },
      { id: "clavinet", label: "Clavinet", emoji: "🎹", aliases: ["clavinet", "clav"] },
    ],
  },
  {
    id: "orchestral-strings",
    label: "Orchestral strings",
    emoji: "🎻",
    items: [
      { id: "violin", label: "Violin", emoji: "🎻", aliases: ["violin"] },
      { id: "viola", label: "Viola", emoji: "🎻", aliases: ["viola"] },
      { id: "cello", label: "Cello", emoji: "🎻", aliases: ["cello"] },
      { id: "double-bass", label: "Double bass / upright bass", emoji: "🎻", aliases: ["double bass", "upright bass", "upright"] },
      { id: "harp", label: "Harp", emoji: "🎻", aliases: ["harp"] },
    ],
  },
  {
    id: "drums-percussion",
    label: "Drums & percussion",
    emoji: "🥁",
    items: [
      { id: "drum-kit", label: "Drum kit (full session)", emoji: "🥁", aliases: ["drum kit", "drums", "kit"] },
      { id: "cajon", label: "Cajón", emoji: "🪘", aliases: ["cajon", "cajón"] },
      { id: "congas", label: "Congas", emoji: "🪘", aliases: ["conga", "congas"] },
      { id: "bongos", label: "Bongos", emoji: "🪘", aliases: ["bongo", "bongos"] },
      { id: "djembe", label: "Djembe", emoji: "🪘", aliases: ["djembe"] },
      { id: "shaker", label: "Shakers", emoji: "🪇", aliases: ["shaker", "shakers", "maracas"] },
      { id: "tambourine", label: "Tambourine", emoji: "🪇", aliases: ["tambourine"] },
      { id: "aux-percussion", label: "Auxiliary hand percussion", emoji: "🪇", aliases: ["aux percussion", "cowbell", "triangle"] },
      { id: "timpani", label: "Timpani", emoji: "🥁", aliases: ["timpani", "kettle drum"] },
      { id: "marimba", label: "Marimba", emoji: "🎼", aliases: ["marimba"] },
      { id: "vibraphone", label: "Vibraphone", emoji: "🎼", aliases: ["vibraphone", "vibes"] },
      { id: "glockenspiel", label: "Glockenspiel", emoji: "🎼", aliases: ["glockenspiel"] },
      { id: "chimes", label: "Chimes / tubular bells", emoji: "🎼", aliases: ["chimes", "tubular bells"] },
    ],
  },
  {
    id: "horns",
    label: "Brass & woodwinds",
    emoji: "🎺",
    items: [
      { id: "trumpet", label: "Trumpet", emoji: "🎺", aliases: ["trumpet"] },
      { id: "flugelhorn", label: "Flugelhorn", emoji: "🎺", aliases: ["flugelhorn"] },
      { id: "trombone", label: "Trombone", emoji: "🎺", aliases: ["trombone"] },
      { id: "sax-alto", label: "Saxophone (alto)", emoji: "🎷", aliases: ["alto sax", "alto saxophone"] },
      { id: "sax-tenor", label: "Saxophone (tenor)", emoji: "🎷", aliases: ["tenor sax", "tenor saxophone", "sax"] },
      { id: "sax-baritone", label: "Saxophone (baritone)", emoji: "🎷", aliases: ["baritone sax", "baritone saxophone"] },
      { id: "sax-soprano", label: "Saxophone (soprano)", emoji: "🎷", aliases: ["soprano sax", "soprano saxophone"] },
      { id: "flute", label: "Flute", emoji: "🪈", aliases: ["flute"] },
      { id: "clarinet", label: "Clarinet", emoji: "🪈", aliases: ["clarinet"] },
      { id: "french-horn", label: "French horn", emoji: "🎺", aliases: ["french horn", "horn"] },
      { id: "tuba", label: "Tuba", emoji: "🎺", aliases: ["tuba"] },
    ],
  },
  {
    id: "vocals",
    label: "Vocals",
    emoji: "🎤",
    items: [
      { id: "vocal-soprano", label: "Lead vocal (soprano)", emoji: "🎤", aliases: ["soprano", "soprano vocal"] },
      { id: "vocal-alto", label: "Lead vocal (alto)", emoji: "🎤", aliases: ["alto", "alto vocal", "mezzo"] },
      { id: "vocal-tenor", label: "Lead vocal (tenor)", emoji: "🎤", aliases: ["tenor", "tenor vocal"] },
      { id: "vocal-bass", label: "Lead vocal (bass)", emoji: "🎤", aliases: ["bass vocal", "baritone vocal"] },
      { id: "background-vocals", label: "Background vocals / harmonies", emoji: "🎤", aliases: ["background vocal", "bgv", "harmonies"] },
      { id: "topliner", label: "Topliner / songwriter", emoji: "🎤", aliases: ["topline", "topliner", "songwriter vocal"] },
      { id: "spoken-word", label: "Spoken word / voiceover", emoji: "🎤", aliases: ["spoken word", "voiceover", "narration"] },
    ],
  },
  {
    id: "world",
    label: "World & traditional",
    emoji: "🌏",
    items: [
      { id: "erhu", label: "Erhu", emoji: "🌏", aliases: ["erhu", "chinese violin"] },
      { id: "sitar", label: "Sitar", emoji: "🌏", aliases: ["sitar"] },
      { id: "bagpipes", label: "Bagpipes", emoji: "🌏", aliases: ["bagpipe", "bagpipes"] },
      { id: "ocarina", label: "Ocarina", emoji: "🌏", aliases: ["ocarina"] },
      { id: "tin-whistle", label: "Tin whistle", emoji: "🌏", aliases: ["tin whistle", "penny whistle"] },
      { id: "accordion", label: "Accordion", emoji: "🌏", aliases: ["accordion"] },
      { id: "harmonica", label: "Harmonica", emoji: "🌏", aliases: ["harmonica", "blues harp"] },
    ],
  },
];

const GROUP_BY_ID = new Map(INSTRUMENT_GROUPS.map((group) => [group.id, group]));

function buildFlatCatalog(): InstrumentCategory[] {
  return INSTRUMENT_GROUPS.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupId: group.id,
      groupLabel: group.label,
    }))
  );
}

export const INSTRUMENT_CATALOG = buildFlatCatalog();

/** @deprecated Use INSTRUMENT_CATALOG */
export const INSTRUMENT_CATEGORIES = INSTRUMENT_CATALOG;

/** Retired ids → closest new id. Ambiguous broad ids are dropped on save. */
const LEGACY_INSTRUMENT_IDS: Record<string, string> = {
  piano: "piano-grand",
  "piano-grand": "piano-grand",
  "piano-upright": "piano-upright",
  rhodes: "rhodes-wurlitzer",
  "rhodes-wurlitzer": "rhodes-wurlitzer",
  organ: "hammond-organ",
  "hammond-organ": "hammond-organ",
  synth: "synthesizer",
  synthesizer: "synthesizer",
  "electric-guitar": "electric-guitar",
  "acoustic-guitar": "acoustic-guitar-steel",
  "acoustic-guitar-steel": "acoustic-guitar-steel",
  "acoustic-guitar-nylon": "acoustic-guitar-nylon",
  "electric-bass": "bass-guitar-electric",
  "bass-guitar-electric": "bass-guitar-electric",
  "bass-guitar-acoustic": "bass-guitar-acoustic",
  "upright-bass": "double-bass",
  "double-bass": "double-bass",
  "drum-kit": "drum-kit",
  drums: "drum-kit",
  percussion: "aux-percussion",
  sax: "sax-tenor",
  saxophone: "sax-tenor",
  "male-vocals": "vocal-tenor",
  "female-vocals": "vocal-alto",
  violin: "violin",
  viola: "viola",
  cello: "cello",
  trumpet: "trumpet",
  trombone: "trombone",
  flute: "flute",
  clarinet: "clarinet",
  banjo: "banjo",
  ukulele: "ukulele",
  mandolin: "mandolin",
};

const FALLBACK_EMOJI = "🎵";
const BY_ID = new Map(INSTRUMENT_CATALOG.map((item) => [item.id, item]));
const ALLOWED_IDS = new Set(INSTRUMENT_CATALOG.map((item) => item.id));

export function isCustomInstrumentId(id: string): boolean {
  return id.startsWith(CUSTOM_INSTRUMENT_PREFIX);
}

export function parseCustomInstrumentId(id: string): { groupId: string; slug: string } | null {
  if (!isCustomInstrumentId(id)) return null;
  const rest = id.slice(CUSTOM_INSTRUMENT_PREFIX.length);
  const splitAt = rest.indexOf(":");
  if (splitAt === -1) return null;
  const groupId = rest.slice(0, splitAt);
  const slug = rest.slice(splitAt + 1);
  if (!GROUP_BY_ID.has(groupId) || !slug) return null;
  return { groupId, slug };
}

export function makeCustomInstrumentId(groupId: string, label: string): string | null {
  const trimmed = label.trim();
  if (trimmed.length < 2 || trimmed.length > 48) return null;
  if (!GROUP_BY_ID.has(groupId)) return null;
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  if (!slug) return null;
  return `${CUSTOM_INSTRUMENT_PREFIX}${groupId}:${slug}`;
}

function formatCustomSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isValidStoredInstrumentId(id: string): boolean {
  if (ALLOWED_IDS.has(id)) return true;
  if (!CUSTOM_ID_PATTERN.test(id)) return false;
  return parseCustomInstrumentId(id) !== null;
}

export function normalizeInstrumentId(id: string): string {
  if (isCustomInstrumentId(id)) return id;
  return LEGACY_INSTRUMENT_IDS[id] ?? id;
}

export function instrumentById(id: string): InstrumentCategory | undefined {
  if (isCustomInstrumentId(id)) return undefined;
  return BY_ID.get(normalizeInstrumentId(id));
}

export function isAllowedInstrumentId(id: string): boolean {
  const normalized = normalizeInstrumentId(id);
  if (isCustomInstrumentId(normalized)) return false;
  return ALLOWED_IDS.has(normalized);
}

export function sanitizeInstrumentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((id): id is string => typeof id === "string")
        .map(normalizeInstrumentId)
        .filter(isValidStoredInstrumentId)
    )
  );
}

export function categoryById(id: string): InstrumentCategory | undefined {
  return instrumentById(id);
}

export function groupForInstrumentId(id: string): InstrumentGroup | undefined {
  const custom = parseCustomInstrumentId(id);
  if (custom) return GROUP_BY_ID.get(custom.groupId);
  const item = instrumentById(id);
  if (!item) return undefined;
  return GROUP_BY_ID.get(item.groupId);
}

export function labelForInstrumentId(id: string): string {
  const custom = parseCustomInstrumentId(id);
  if (custom) return formatCustomSlug(custom.slug);
  const item = instrumentById(id);
  if (!item) return id;
  return item.label;
}

export function displayLabelForInstrumentId(id: string): string {
  const group = groupForInstrumentId(id);
  const groupLabel = group?.label ?? "Other";
  return `${groupLabel} · ${labelForInstrumentId(id)}`;
}

/**
 * Map a free-text job instrument to one category. More specific aliases
 * are checked before generic ones.
 */
export function categoryForInstrument(instrument: string): InstrumentCategory {
  const key = instrument.trim().toLowerCase();
  if (!key) return fallbackCategory();

  const ranked = [...INSTRUMENT_CATALOG].sort((a, b) => longestAlias(b) - longestAlias(a));

  for (const category of ranked) {
    if (category.aliases.some((alias) => key.includes(alias) || alias.includes(key))) {
      return category;
    }
    if (category.label.toLowerCase() === key || category.id === key) {
      return category;
    }
  }

  const legacy = LEGACY_INSTRUMENT_IDS[key];
  if (legacy) return BY_ID.get(legacy) ?? fallbackCategory();

  return fallbackCategory();
}

function fallbackCategory(): InstrumentCategory {
  return {
    id: "other",
    label: "Other",
    emoji: FALLBACK_EMOJI,
    aliases: [],
    groupId: "other",
    groupLabel: "Other",
  };
}

function longestAlias(category: InstrumentCategory) {
  return category.aliases.reduce((max, alias) => Math.max(max, alias.length), 0);
}

export function emojiForInstrument(instrument: string): string {
  return categoryForInstrument(instrument).emoji || FALLBACK_EMOJI;
}

export function jobMatchesAlertFilters(
  instrument: string,
  instrumentId: string | null | undefined,
  selectedIds: string[]
): boolean {
  if (selectedIds.includes(ALL_INSTRUMENTS_ID)) return true;
  if (selectedIds.length === 0) return false;
  const jobId = normalizeInstrumentId(instrumentId ?? categoryForInstrument(instrument).id);
  if (isCustomInstrumentId(jobId)) return false;
  const normalizedSelected = selectedIds.map(normalizeInstrumentId);
  return normalizedSelected.includes(jobId);
}

export type NetworkInstrument = InstrumentCategory & {
  musicianCount: number;
  status: "available" | "coming-soon";
};

export function buildNetworkInstrumentList(
  musicianCounts: Record<string, number>
): { available: NetworkInstrument[]; comingSoon: NetworkInstrument[] } {
  const available: NetworkInstrument[] = [];
  const comingSoon: NetworkInstrument[] = [];

  for (const item of INSTRUMENT_CATALOG) {
    const musicianCount = musicianCounts[item.id] ?? 0;
    const status = musicianCount > 0 ? ("available" as const) : ("coming-soon" as const);
    const entry = { ...item, musicianCount, status };
    if (status === "available") available.push(entry);
    else comingSoon.push(entry);
  }

  return { available, comingSoon };
}

export function isInstrumentAvailableForPosting(
  instrumentId: string,
  musicianCounts: Record<string, number>
): boolean {
  const id = normalizeInstrumentId(instrumentId);
  if (isCustomInstrumentId(id) || !instrumentById(id)) return false;
  return (musicianCounts[id] ?? 0) > 0;
}
