/**
 * Instrument icons ("Mark" style from the brand system). Drawn on a 24px grid.
 * Roles: b = body (solid ink), l = detail line, k = solid ink detail, w = accent detail.
 */
import { categoryForInstrument } from "@/lib/instruments";

type Glyph = { b?: string[]; l?: string[]; k?: string[]; w?: string[] };

const G: Record<string, Glyph> = {
  acoustic: {
    b: ["M9.25 12.8A5 5 0 1 0 14.75 12.8A3.6 3.6 0 1 0 9.25 12.8Z"],
    l: ["M11.25 7V3.9M12.75 7V3.9", "M10.6 19.1h2.8", "M10.9 1.4h2.2a.7.7 0 01.7.7v1.1a.7.7 0 01-.7.7h-2.2a.7.7 0 01-.7-.7V2.1a.7.7 0 01.7-.7z"],
    w: ["M13.5 15.2a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"],
  },
  electric: {
    b: ["M8.6 9.8c-1.3-.5-2.3.6-1.9 1.9.3 1 1.3 1.6 1.3 2.9 0 .9-1.5 1.6-1.5 3.4 0 2.3 2.5 3.8 5.5 3.8s5.5-1.5 5.5-3.8c0-1.8-1.5-2.5-1.5-3.4 0-1.3 1.2-1.9 1.4-3.2.2-1.4-.9-2.4-2.1-1.8-.8.4-1.1 1.4-1.9 1.9h-2.8c-.7-.5-1-1.4-2-1.7z"],
    l: ["M11.3 11.5V3.6M12.7 11.5V3.6", "M10.2 14.3h3.6M10.2 16.5h3.6", "M10.7 18.8h2.6", "M11 1.3h2.1c.6 0 1 .4 1 1v.6c0 .4-.3.7-.7.7H11a.6.6 0 01-.6-.6V1.9c0-.3.3-.6.6-.6z"],
    w: ["M16 19a.7.7 0 11-1.4 0 .7.7 0 011.4 0z"],
  },
  bass: {
    b: ["M9 12.2c-1.1-.4-2 .5-1.6 1.6.2.8 1 1.3 1 2.3 0 .8-1.2 1.3-1.2 2.8 0 1.9 2.1 3.1 4.8 3.1s4.8-1.2 4.8-3.1c0-1.5-1.2-2-1.2-2.8 0-1 .8-1.5 1-2.3.4-1.1-.5-2-1.6-1.6-.7.3-1 1.1-1.6 1.5h-2.8c-.6-.4-.9-1.2-1.6-1.5z"],
    l: ["M11.4 13.7V3.8M12.6 13.7V3.8", "M10.6 17h2.8", "M10.9 19.4h2.2", "M9.5 1.9h1.1M9.5 3.1h1.1M13.4 1.9h1.1M13.4 3.1h1.1", "M11.3 1h1.4a.8.8 0 01.8.8v1.4a.8.8 0 01-.8.8h-1.4a.8.8 0 01-.8-.8V1.8a.8.8 0 01.8-.8z"],
  },
  grand: {
    b: ["M4 3.5h6.5c.8 3.6 2.6 4.8 5.2 6 2.7 1.2 4.3 3 4.3 5.7V20.5H4z"],
    l: ["M4 15.5h16", "M7.2 15.5v5M10.4 15.5v5M13.6 15.5v5M16.8 15.5v5", "M7 6.5l6.5 7"],
  },
  piano: {
    b: ["M4.5 3.5h15a1 1 0 011 1v16h-17v-16a1 1 0 011-1z"],
    l: ["M3.5 12h17", "M7.75 12v8.5M12 12v8.5M16.25 12v8.5", "M8 7.5h8"],
    k: ["M5.9 12h1.8v4.2h-1.8z", "M10.1 12h1.8v4.2h-1.8z", "M14.3 12h1.8v4.2h-1.8z"],
  },
  synth: {
    b: ["M2.5 8a2 2 0 012-2h15a2 2 0 012 2v8a2 2 0 01-2 2h-15a2 2 0 01-2-2z"],
    l: ["M2.5 12.5h19", "M5.5 12.5V18M8.5 12.5V18M11.5 12.5V18M14.5 12.5V18M17.5 12.5V18", "M14.2 8.2v2.4M16.7 8.2v2.4M19.2 8.2v2.4"],
    w: ["M7.1 9.3a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0z", "M10.6 9.3a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0z"],
  },
  drums: {
    b: ["M5 10c0-1.4 3.1-2.5 7-2.5s7 1.1 7 2.5v5.5c0 1.7-3.1 3-7 3s-7-1.3-7-3z"],
    l: ["M5 10c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5", "M8 12.2v5.8M12 12.5v6M16 12.2v5.8", "M3.6 3l6.6 5.4M20.4 3l-6.6 5.4"],
  },
  bongos: {
    b: ["M2.8 8.6h8l-1.3 10.4a1 1 0 01-1 .9H5.1a1 1 0 01-1-.9z", "M13.2 10.6h8l-1.2 8.4a1 1 0 01-1 .9h-3.6a1 1 0 01-1-.9z"],
    l: ["M2.8 8.6c0-.9 1.8-1.6 4-1.6s4 .7 4 1.6-1.8 1.6-4 1.6-4-.7-4-1.6z", "M13.2 10.6c0-.9 1.8-1.6 4-1.6s4 .7 4 1.6-1.8 1.6-4 1.6-4-.7-4-1.6z", "M10.3 13.6h3.3"],
  },
  mic: {
    b: ["M9 5.5a3 3 0 016 0v5a3 3 0 01-6 0z"],
    l: ["M9.2 6.6h5.6M9.2 8.8h5.6", "M6 10.5a6 6 0 0012 0", "M12 16.5v4M9 20.5h6"],
  },
  violin: {
    b: ["M11.2 7.2c-2.3 0-3.6 1.1-3.6 2.7 0 1.1.8 1.6.8 2.4 0 .8-1.3 1.3-1.3 3.2 0 2.3 1.9 3.9 4.1 3.9s4.1-1.6 4.1-3.9c0-1.9-1.3-2.4-1.3-3.2 0-.8.8-1.3.8-2.4 0-1.6-1.3-2.7-3.6-2.7z"],
    l: ["M11.2 7.2V3.7", "M9.8 12.4c.5.8-.5 1.9 0 2.8M12.6 12.4c-.5.8.5 1.9 0 2.8", "M11.2 16.6v2", "M19.4 2.8l-1.7 17.8M17 19.8l1.4.3"],
    w: ["M12.3 2.6a1.1 1.1 0 11-2.2 0 1.1 1.1 0 012.2 0z"],
  },
  cello: {
    b: ["M12 5.8c-2.8 0-4.4 1.3-4.4 3.3 0 1.3 1 1.9 1 2.9 0 1-1.6 1.6-1.6 3.9 0 2.8 2.3 4.7 5 4.7s5-1.9 5-4.7c0-2.3-1.6-2.9-1.6-3.9 0-1 1-1.6 1-2.9 0-2-1.6-3.3-4.4-3.3z"],
    l: ["M12 5.8V2.9", "M10.3 11.8c.6 1-.6 2.3 0 3.4M13.7 11.8c-.6 1 .6 2.3 0 3.4", "M12 17v2.4", "M12 20.6v2.6"],
    w: ["M12.9 2a.9.9 0 11-1.8 0 .9.9 0 011.8 0z"],
  },
  trumpet: {
    b: ["M3.5 10.6h9l6.5-3.1v9l-6.5-3.1h-9z"],
    l: ["M2 10.2v3.4", "M7.2 10.6V7.7M9.4 10.6V7.7M11.6 10.6V7.7", "M6.5 7.4h1.4M8.7 7.4h1.4M10.9 7.4h1.4", "M5.5 13.4v2.1a1.5 1.5 0 001.5 1.5h4.5a1.5 1.5 0 001.5-1.5v-2.1"],
  },
  sax: {
    b: ["M8.4 5V15.6A4.5 4.5 0 0 0 17.4 15.6V13L19.6 10.2H14.4L15.6 13V15.6A2.1 2.1 0 0 1 11.4 15.6V5Z"],
    l: ["M9.9 5L8.2 2.7 5.6 2.2"],
    w: ["M10.6 8a.7.7 0 11-1.4 0 .7.7 0 011.4 0z", "M10.6 10.4a.7.7 0 11-1.4 0 .7.7 0 011.4 0z", "M10.6 12.8a.7.7 0 11-1.4 0 .7.7 0 011.4 0z"],
  },
  flute: {
    b: ["M3.4 18.4L18.4 3.4a1.5 1.5 0 012.2 2.2L5.6 20.6a1.5 1.5 0 01-2.2-2.2z"],
    l: ["M15.6 4.2l4.2 4.2"],
    w: ["M9.9 14.1a.8.8 0 11-1.6 0 .8.8 0 011.6 0z", "M12.2 11.8a.8.8 0 11-1.6 0 .8.8 0 011.6 0z", "M14.5 9.5a.8.8 0 11-1.6 0 .8.8 0 011.6 0z"],
  },
  harp: {
    b: ["M5 3.5c0-.6.8-.9 1.2-.4C9 6.6 13 12.4 19.2 18.4c.5.5.2 1.6-.6 1.6H6a1 1 0 01-1-1z"],
    l: ["M8.5 7.6V20M11.5 11.4V20M14.5 14.8V20"],
  },
  mallets: {
    b: ["M2.8 7h3.4v11H2.8z", "M7.6 8.2H11v8.6H7.6z", "M12.4 9.4h3.4v6.2h-3.4z", "M17.2 10.6h3.4v3.8h-3.4z"],
    l: ["M2 12.5h19.4"],
  },
  note: {
    b: ["M9 17.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM20 15.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"],
    l: ["M9 17.5V5.5l11-2v12", "M9 9.5l11-2"],
  },
};

const BY_ID: Record<string, string> = {
  "electric-guitar": "electric",
  "acoustic-guitar-steel": "acoustic",
  "acoustic-guitar-nylon": "acoustic",
  "bass-guitar-electric": "bass",
  "bass-guitar-acoustic": "bass",
  banjo: "acoustic",
  mandolin: "acoustic",
  ukulele: "acoustic",
  "piano-grand": "grand",
  "piano-upright": "piano",
  "rhodes-wurlitzer": "piano",
  synthesizer: "synth",
  "hammond-organ": "piano",
  mellotron: "piano",
  clavinet: "piano",
  violin: "violin",
  viola: "violin",
  erhu: "violin",
  cello: "cello",
  "double-bass": "cello",
  harp: "harp",
  "drum-kit": "drums",
  timpani: "drums",
  marimba: "mallets",
  vibraphone: "mallets",
  glockenspiel: "mallets",
  chimes: "mallets",
  trumpet: "trumpet",
  flugelhorn: "trumpet",
  trombone: "trumpet",
  "french-horn": "trumpet",
  tuba: "trumpet",
  flute: "flute",
  clarinet: "flute",
  "tin-whistle": "flute",
  ocarina: "flute",
};

const BY_GROUP: Record<string, string> = {
  fretted: "acoustic",
  keyboards: "piano",
  "orchestral-strings": "violin",
  "drums-percussion": "bongos",
  vocals: "mic",
  horns: "trumpet",
};

function glyphKey(instrument: string): string {
  const cat = categoryForInstrument(instrument);
  const id = cat?.id ?? instrument;
  if (BY_ID[id]) return BY_ID[id];
  if (/sax/.test(id)) return "sax";
  if (/vocal|voice|singer|topline|spoken|rap/.test(id)) return "mic";
  if (/mallet|marimba|vibe|glock/.test(id)) return "mallets";
  return (cat && BY_GROUP[cat.groupId]) || "note";
}

/** SVG markup for an instrument. `uid` must be unique per rendered icon (mask ids). */
export function instrumentIconSvg(instrument: string, uid: string): string {
  const g = G[glyphKey(instrument)] ?? G.note;
  const p = (ds: string[] | undefined, a = "") =>
    (ds || [])
      .map((d) => `<path d="${d}"${d.includes("zM") ? ' fill-rule="evenodd"' : ""}${a}/>`)
      .join("");
  const cut = ' fill="#000" stroke="#000" stroke-width="1.2" stroke-linejoin="round"';
  const box = '<rect x="-4" y="-4" width="32" height="32" fill="#fff"/>';
  const id = `rtm${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return `<svg class="ico-mark" viewBox="0 0 24 24" aria-hidden="true"><defs><mask id="${id}b" maskUnits="userSpaceOnUse">${box}<g fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${p(g.l)}</g>${p(g.k, cut)}${p(g.w, cut)}</mask><mask id="${id}l" maskUnits="userSpaceOnUse">${box}${p(g.b, cut)}</mask></defs><g class="l" mask="url(#${id}l)">${p(g.l)}</g><g class="b" mask="url(#${id}b)">${p(g.b)}</g><g class="w">${p(g.w)}</g></svg>`;
}
