/* Custom avatars: SVG drawn from parts. Pure functions, safe on server and client. */

export type AvatarSettings = Record<string, string>;
type Part = (c: string, s: string, id: string) => string;
type PartMap = Record<string, Part>;

const INK = "#111113";
const GOLD = "#f1c046", GOLD_D = "#b9861f", SILVER = "#d9dde3", GEM = "#bfe8ff";
const ACC = "#7b61ff", ACC_INK = "#604cc7", ACC_SOFT = "#f3f1ff", ACC_LIGHT = "#b6a8ff", ACC_DUO = "#e2dcff";
const RAVE = [ACC_LIGHT, ACC, ACC_DUO, ACC_INK, "#f4f2ec"];

export const PAL: Record<string, string[]> = {
  skin: ["#fbe0cb", "#f2c4a0", "#dea47c", "#bb7c51", "#8e5635", "#5c3721"],
  hairColor: ["#1c1a1f", "#4a2f22", "#7a5234", "#8a4b2a", "#c4572a", "#e0ad4c", "#f3e4b8", "#cfcbc3", ACC, ACC_LIGHT],
  shirt: ["#1f2033", "#f4f2ec", "#cfcbc3", ACC, ACC_INK, ACC_LIGHT, "#d9825b", "#7fae8e", "#7fa6d6", "#e8c667"],
  gear: ["#1f2033", "#f4f2ec", "#cfcbc3", ACC, ACC_LIGHT, "#d9825b", "#7fae8e", "#e8c667"],
  bg: [ACC_SOFT, ACC_DUO, "#efede8", "#e4e1d9", "#fbe6da", "#f8efcf", "#e2f0e6", "#e0eaf6"],
};
const rgbOf = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const nearest = (h: unknown, list: string[]): string => {
  if (typeof h !== "string" || !/^#[0-9a-f]{6}$/i.test(h)) return list[0];
  const c = rgbOf(h);
  return list.reduce<[string, number]>((best, x) => {
    const d = rgbOf(x).reduce((s, v, i) => s + (v - c[i]) ** 2, 0);
    return d < best[1] ? [x, d] : best;
  }, [list[0], Infinity])[0];
};

export const OPTS: Record<string, string[]> = {
  hair: ["short", "buzz", "flow", "wavy", "curly", "afro", "mullet", "long", "bun", "swoop", "locs", "bald"],
  eyes: ["dots", "happy", "wide", "sleepy", "wink", "stars"],
  mouth: ["smile", "grin", "calm", "sing", "smirk", "tongue"],
  facial: ["none", "stubble", "mustache", "handlebar", "goatee", "beard"],
  head: ["none", "headphones", "beanie", "cap", "bucket", "cowboy", "party", "halo", "horns", "unicorn", "cat", "bunny", "bear", "flowers"],
  eyewear: ["none", "round", "shades", "hearts", "visor", "monocle"],
  earring: ["none", "gold", "stud", "blunt", "pencil"],
  ears: ["round", "elf"],
  paint: ["none", "third", "gems", "freckles", "star", "heart"],
  nose: ["classic", "snub", "pointy", "bulb", "wide", "roman", "dot"],
  cover: ["none", "bandana", "pacifier"],
  top: ["tee", "tank", "button", "hoodie", "aloha", "stripes", "band", "tiedye"],
  neck: ["none", "chain", "kandi", "phones", "whistle"],
};

export const NAMES: Record<string, string> = {
  short: "Short", buzz: "Buzz", flow: "Flow", wavy: "Wavy", curly: "Curly", afro: "Afro", mullet: "Mullet", long: "Long", bun: "Bun", swoop: "Swoop", locs: "Locs", bald: "Bald",
  dots: "Dots", happy: "Happy", wide: "Wide", sleepy: "Sleepy", wink: "Wink", stars: "Starstruck",
  smile: "Smile", grin: "Grin", calm: "Calm", sing: "Singing", smirk: "Smirk", tongue: "Tongue out",
  none: "None", stubble: "Stubble", mustache: "Mustache", handlebar: "Handlebar", goatee: "Goatee", beard: "Beard",
  classic: "Classic", snub: "Button", pointy: "Pointy", bulb: "Round", roman: "Roman", dot: "Dot",
  headphones: "Headphones", beanie: "Beanie", cap: "Cap", bucket: "Bucket hat", cowboy: "Cowboy", party: "Party hat",
  halo: "Halo", horns: "Devil horns", unicorn: "Unicorn", cat: "Cat ears", bunny: "Bunny ears", bear: "Bear ears", flowers: "Flower crown",
  round: "Round", shades: "Shades", hearts: "Hearts", visor: "Rave visor", monocle: "Monocle",
  gold: "Gold hoop", stud: "Stud", blunt: "Blunt", pencil: "Pencil",
  elf: "Elf",
  third: "Third eye", gems: "Face gems", freckles: "Freckles", star: "Star", heart: "Heart",
  bandana: "Rave bandana", pacifier: "Pacifier",
  tee: "Tee", tank: "Tank", button: "Button-up", hoodie: "Hoodie", aloha: "Aloha", stripes: "Stripes", band: "Band tee", tiedye: "Tie-dye",
  chain: "Gold chain", kandi: "Kandi", phones: "DJ cans", whistle: "Whistle",
};

const o = (fill: string, extra = "") => `fill="${fill}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" ${extra}`;
const line = (w = 2) => `fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const tube = (d: string, color: string, w = 5.5) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3.4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const ring = (d: string, color: string, w = 1.8) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 1.8}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}`;
const star = (cx: number, cy: number, R: number, r: number) => Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r : R;
  return `${i ? "L" : "M"}${(cx + d * Math.cos(a)).toFixed(2)} ${(cy + d * Math.sin(a)).toFixed(2)}`;
}).join("") + "Z";
const heart = (cx: number, cy: number, s: number) => `M${cx} ${cy + s * 0.9}C${cx - s * 1.5} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.3} ${cx} ${cy - s * 0.45}C${cx + s * 0.9} ${cy - s * 1.3} ${cx + s * 1.5} ${cy - s * 0.1} ${cx} ${cy + s * 0.9}Z`;
const gem = (x: number, y: number, s: number, c: string) => `<path d="M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z" fill="${c}" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>`;
const nil: Part = () => "";

const HAIR_BACK: PartMap = {
  long: (c) => `<path ${o(c)} d="M35 60C33 34 46 26 60 26C74 26 87 34 85 60C86 76 90 88 92 97C80 101 72 99 68 93H52C48 99 40 101 28 97C30 88 34 76 35 60Z"/>`,
  curly: (c) => [[34, 60], [35, 45], [43, 33], [55, 27], [67, 27], [78, 33], [85, 45], [86, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" ${o(c)}/>`).join("") + `<circle cx="60" cy="48" r="25" fill="${c}"/>`,
  bun: (c) => `<circle cx="60" cy="25" r="11" ${o(c)}/>`,
  flow: (c) => `<path ${o(c)} d="M34.5 60C32 37 45 27 60 27C75 27 88 37 85.5 60C86 70 87.5 78 91 85C87 88.5 82 88 79 84H41C38 88 33 88.5 29 85C32.5 78 34 70 34.5 60Z"/>`,
  wavy: (c) => `<path ${o(c)} d="M35 57C33 36 46 27 60 27C74 27 87 36 85 57C88.5 62 84.5 67 87.5 72.5C90 77.5 86.5 81.5 82.5 79.5H37.5C33.5 81.5 30 77.5 32.5 72.5C35.5 67 31.5 62 35 57Z"/>`,
  afro: (c) => `<circle cx="60" cy="46" r="31" ${o(c)}/>`,
  locs: (c) => [[36, 58, 36, 98], [42, 60, 41, 101], [78, 60, 79, 101], [84, 58, 85, 98]].map(([x1, y1, x2, y2]) => tube(`M${x1} ${y1}L${x2} ${y2}`, c, 6)).join(""),
};
/* Behind the neck and shirt. */
const HAIR_NAPE: PartMap = {
  mullet: (c) => `<path ${o(c)} d="M41 62C40.5 76 38.5 86 33.5 95C43 97 52 95 56 90V62ZM79 62C79.5 76 81.5 86 86.5 95C77 97 68 95 64 90V62Z"/>`,
};
const HAIR_FRONT: PartMap = {
  short: (c) => `<path ${o(c)} d="M37 59C35 38 46 30 60 30C74 30 85 38 83 59C80 49 72 44 62 45C56 42 44 46 37 59Z"/>`,
  buzz: (c) => `<path ${o(c)} d="M38 54C38 40 48 34 60 34C72 34 82 40 82 54C78 47 70 44 60 44C50 44 42 47 38 54Z"/>`,
  flow: (c) => `<path ${o(c)} d="M37 62C34.5 38 46 29.5 60 29.5C74 29.5 85.5 38 83 62C81 51 75 43.5 61 41C58 44 50 44 45 46C41 50 38.5 55 37 62Z"/><path d="M61 31.5C60 35 60.5 38.5 61 41" ${line(1.3)} opacity=".4"/>`,
  wavy: (c) => `<path ${o(c)} d="M37 58C35 38 46 30 60 30C74 30 85 38 83 58C81.5 54 78.5 51 75.5 52C73.5 48 69.5 46.5 66.5 48.5C63.5 45.5 57 45.5 54 48.5C51 46.5 47 48 45 52C42 51 38.5 54 37 58Z"/>`,
  afro: (c) => `<path ${o(c)} d="M38 56C37 42 47 36 60 36C73 36 83 42 82 56C78 49 70 46 60 46C50 46 42 49 38 56Z"/>`,
  mullet: (c) => `<path ${o(c)} d="M37.5 58C35.5 38 46 31 60 31C74 31 84.5 38 82.5 58C80 50 74 46.5 67 46C64 42 56 43 51 45.5C45 46.5 40 51 37.5 58Z"/>`,
  curly: (c) => [[42, 45], [50, 39], [60, 37], [70, 39], [78, 45]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" ${o(c)}/>`).join(""),
  long: (c) => `<path ${o(c)} d="M37 61C35 38 46 29 60 29C74 29 85 38 83 61C80 51 74 45 66 41C60 49 48 55 37 61Z"/>`,
  bun: (c) => `<path ${o(c)} d="M37 57C36 39 47 32 60 32C73 32 84 39 83 57C79 47 71 43 60 43C49 43 41 47 37 57Z"/>`,
  swoop: (c) => `<path ${o(c)} d="M37 57C33 34 44 21 63 21C79 21 89 32 84 57C82 46 76 42 68 42C58 38 46 44 37 57Z"/>`,
  locs: (c) => `<path ${o(c)} d="M37 58C35 38 46 30 60 30C74 30 85 38 83 58C79 48 71 43 60 43C49 43 41 48 37 58Z"/>`,
  bald: () => `<path d="M49 42C52 39 56 38 59 38" ${line(1.6)} opacity=".25"/>`,
};
const EARS: PartMap = {
  round: (s) => `<circle cx="38" cy="63" r="5.2" ${o(s)}/><circle cx="82" cy="63" r="5.2" ${o(s)}/>`,
  elf: (s) => `<path ${o(s)} d="M41 58C36 54 30 49 25 43C26 52 29 62 33.5 67C36 69.5 39.5 69.5 41.5 67Z"/><path ${o(s)} d="M79 58C84 54 90 49 95 43C94 52 91 62 86.5 67C84 69.5 80.5 69.5 78.5 67Z"/><path d="M34 55Q31.5 60 35 64.5M86 55Q88.5 60 85 64.5" ${line(1.3)} opacity=".35"/>`,
};
const EYES: Record<string, string> = {
  dots: `<circle cx="51" cy="61" r="2.7" fill="${INK}"/><circle cx="69" cy="61" r="2.7" fill="${INK}"/>`,
  happy: `<path d="M47.5 62.5Q51 57.5 54.5 62.5M65.5 62.5Q69 57.5 72.5 62.5" ${line(2.2)}/>`,
  wide: `<circle cx="51" cy="61" r="4.3" ${o("#fff", 'stroke-width="1.6"')}/><circle cx="69" cy="61" r="4.3" ${o("#fff", 'stroke-width="1.6"')}/><circle cx="51.8" cy="61.6" r="2.1" fill="${INK}"/><circle cx="69.8" cy="61.6" r="2.1" fill="${INK}"/>`,
  sleepy: `<path d="M47 60.5H55M65 60.5H73" ${line(2)}/><path d="M48 60.5Q51 64 54 60.5M66 60.5Q69 64 72 60.5" fill="${INK}"/>`,
  wink: `<circle cx="51" cy="61" r="2.7" fill="${INK}"/><path d="M65.5 62.5Q69 57.5 72.5 62.5" ${line(2.2)}/>`,
  stars: `<path d="${star(51, 61, 4.4, 1.9)}" ${o("#f3c74a", 'stroke-width="1.3"')}/><path d="${star(69, 61, 4.4, 1.9)}" ${o("#f3c74a", 'stroke-width="1.3"')}/>`,
};
const MOUTH: Record<string, string> = {
  smile: `<path d="M53 73Q60 79.5 67 73" ${line(2.2)}/>`,
  grin: `<path d="M51.5 71.5Q60 83 68.5 71.5Z" ${o("#fff", 'stroke-width="1.8"')}/>`,
  calm: `<path d="M55 74.5H65" ${line(2.2)}/>`,
  sing: `<ellipse cx="60" cy="75" rx="4.2" ry="5.2" ${o("#7a2433", 'stroke-width="1.8"')}/>`,
  smirk: `<path d="M54 75Q62 77.5 67.5 71.5" ${line(2.2)}/>`,
  tongue: `<path d="M52 72Q60 81 68 72Z" ${o("#7a2433")}/><path d="M56 75.2Q56 83 60 83Q64 83 64 75.2Z" ${o("#ff7e9a", 'stroke-width="1.5"')}/><path d="M60 76V80" ${line(1.1)} opacity=".45"/>`,
};
/* Under the mouth. */
const FACIAL: PartMap = {
  none: nil,
  stubble: (c) => `<path d="M39.5 67C41 80 50 85.2 60 85.2C70 85.2 79 80 80.5 67C77 76 70 79.5 60 79.5C50 79.5 43 76 39.5 67Z" fill="${c}" opacity=".3"/>`,
  goatee: (c) => `<path ${o(c, 'stroke-width="1.5"')} d="M54 80.5C56.5 79.3 63.5 79.3 66 80.5C66.5 85.5 63.5 90.5 60 91.5C56.5 90.5 53.5 85.5 54 80.5Z"/>`,
  beard: (c) => `<path ${o(c)} d="M38 62C38 83 48 93 60 93C72 93 82 83 82 62C80 70 76 72 72 72C68 79 52 79 48 72C44 72 40 70 38 62Z"/>`,
};
/* Over the mouth, tucked under the nose. */
const STACHE: PartMap = {
  mustache: (c) => `<path ${o(c, 'stroke-width="1.5"')} d="M60 68.4C57 67.2 53.6 67.4 51.2 69.4C50 70.4 49 71.4 48.6 72.6C51.6 73.4 55.6 73 60 71.6C64.4 73 68.4 73.4 71.4 72.6C71 71.4 70 70.4 68.8 69.4C66.4 67.4 63 67.2 60 68.4Z"/>`,
  handlebar: (c) => ring("M53 70.6C49 72.3 45.4 71.2 45 68.4C44.7 66.4 46.2 65.4 47.6 66.4M67 70.6C71 72.3 74.6 71.2 75 68.4C75.3 66.4 73.8 65.4 72.4 66.4", c, 1.9)
    + `<path ${o(c, 'stroke-width="1.5"')} d="M60 68.6C57.6 67.2 54.2 67.6 52.2 70.2C54.8 72 57.6 71.8 60 70.7C62.4 71.8 65.2 72 67.8 70.2C65.8 67.6 62.4 67.2 60 68.6Z"/>`,
};
const PAINT: Record<string, string> = {
  none: "",
  third: `<path d="M52.5 46.5Q60 40 67.5 46.5Q60 53 52.5 46.5Z" ${o("#fff", 'stroke-width="1.6"')}/><circle cx="60" cy="46.5" r="3" fill="#8f7bff"/><circle cx="60" cy="46.5" r="1.3" fill="${INK}"/><path d="M60 36.5V39M52.5 38.5L54 40.5M67.5 38.5L66 40.5" ${line(1.4)}/>`,
  gems: gem(43.5, 66, 2.4, GEM) + gem(47, 70.2, 1.7, "#ff9fd0") + gem(42.2, 71.4, 1.3, "#f7d154") + gem(76.5, 66, 2.4, GEM) + gem(73, 70.2, 1.7, "#ff9fd0") + gem(77.8, 71.4, 1.3, "#f7d154"),
  freckles: [[44.5, 66], [48, 68.2], [43.5, 69.6], [47, 71], [75.5, 66], [72, 68.2], [76.5, 69.6], [73, 71], [57.4, 66.4], [62.8, 66.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#3b2417" opacity=".5"/>`).join(""),
  star: `<path d="${star(45, 69, 4.6, 2)}" ${o("#f3c74a", 'stroke-width="1.3"')}/>`,
  heart: `<path d="${heart(75, 69, 3.4)}" ${o("#ff5d8f", 'stroke-width="1.3"')}/>`,
};
const NOSE: PartMap = {
  classic: () => `<path d="M60.5 63Q58 68 61.5 69" ${line(1.6)}/>`,
  snub: () => `<path d="M57.6 66.8Q60 69.8 62.4 66.8" ${line(1.6)}/>`,
  pointy: () => `<path d="M60.8 61.5L57.4 68.4H61.2" ${line(1.6)}/>`,
  bulb: (s) => `<circle cx="60" cy="66.4" r="3.4" ${o(s, 'stroke-width="1.5"')}/><path d="M58.4 65.2Q59 64.4 60 64.3" stroke="#fff" stroke-width="1" stroke-linecap="round" fill="none" opacity=".7"/>`,
  wide: () => `<path d="M57.4 64.8Q55 67.6 57.8 68.9Q60 69.8 62.2 68.9Q65 67.6 62.6 64.8" ${line(1.6)}/>`,
  roman: () => `<path d="M59.2 60.5Q62.8 64.5 62.4 67.6Q61.8 69.4 58.4 68.6" ${line(1.6)}/>`,
  dot: () => `<ellipse cx="60" cy="67" rx="2.3" ry="1.7" fill="${INK}" opacity=".75"/>`,
};
const COVER: PartMap = {
  none: nil,
  bandana: (g) => `<path ${o(g)} d="M36.6 63C46 66.8 74 66.8 83.4 63C84 71.5 80.5 78.5 74.5 82.5L60 93.5L45.5 82.5C39.5 78.5 36 71.5 36.6 63Z"/>`
    + [[46, 71], [60, 73.5], [74, 71], [53, 80], [67, 80], [60, 87]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="none" stroke="#fff" stroke-width="1.2" opacity=".85"/><circle cx="${x}" cy="${y}" r=".7" fill="#fff" opacity=".85"/>`).join("")
    + `<path d="M38 66.6C48 70 72 70 82 66.6" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".45"/>`,
  pacifier: (g) => ring(circ(60, 83, 3.4), g, 2) + `<rect x="51.5" y="71" width="17" height="8.5" rx="4.25" ${o(g)}/><circle cx="60" cy="75.2" r="2.2" fill="#fff" opacity=".7"/>`,
};
const EYEWEAR: Record<string, string> = {
  none: "",
  round: `<circle cx="51" cy="61" r="7.5" ${o("rgba(255,255,255,.28)", 'stroke-width="2"')}/><circle cx="69" cy="61" r="7.5" ${o("rgba(255,255,255,.28)", 'stroke-width="2"')}/><path d="M58.5 61H61.5M43.5 60H38.5M76.5 60H81.5" ${line(2)}/>`,
  shades: `<path d="M42 56.5H58V62A5.5 5.5 0 0 1 52.5 67.5H47.5A5.5 5.5 0 0 1 42 62Z" ${o(INK)}/><path d="M62 56.5H78V62A5.5 5.5 0 0 1 72.5 67.5H67.5A5.5 5.5 0 0 1 62 62Z" ${o(INK)}/><path d="M58 58H62M42 57.5H38.5M78 57.5H81.5" ${line(2)}/><path d="M45 59L48 58" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`,
  hearts: `<path d="${heart(51, 61.6, 5.4)}" ${o("#ff5d8f", 'stroke-width="1.9" fill-opacity=".9"')}/><path d="${heart(69, 61.6, 5.4)}" ${o("#ff5d8f", 'stroke-width="1.9" fill-opacity=".9"')}/><path d="M58.6 59H61.4M43.4 58.5H38.5M76.6 58.5H81.5" ${line(2)}/><path d="M46 58.4L48.4 57.6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
  visor: `<rect x="39" y="54.5" width="42" height="13" rx="6.5" ${o("#1f2033")}/><path d="M44.5 61H75.5" stroke="#5fd0ff" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="2.6 2.4"/><path d="M44.5 61H75.5" stroke="#ff7eb0" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="2.6 2.4" stroke-dashoffset="2.5" opacity=".9"/><path d="M39 59.5H35M81 59.5H85" ${line(2)}/>`,
  monocle: `<circle cx="69" cy="61" r="7.2" fill="rgba(255,255,255,.35)"/>${ring(circ(69, 61, 7.2), GOLD, 2)}<path d="M75.5 65.5Q81 77 74.5 89" fill="none" stroke="${GOLD_D}" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="1.4 1.3"/><path d="M65 57.5L67 56.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".8"/>`,
};
const BAND = (g: string) => tube("M37 55C35 27 85 27 83 55", g, 3);
const FLOWERS: [number, number, string][] = [[39, 45, RAVE[0]], [47.5, 37, RAVE[4]], [60, 33.5, RAVE[1]], [72.5, 37, RAVE[2]], [81, 45, RAVE[0]]];
const HEAD: PartMap = {
  none: nil,
  headphones: (c) => tube("M33 62C30 30 47 21 60 21C73 21 90 30 87 62", c, 5) + `<rect x="27" y="52" width="13" height="21" rx="6" ${o(c)}/><rect x="80" y="52" width="13" height="21" rx="6" ${o(c)}/>`,
  beanie: (c) => `<path ${o(c)} d="M35 50C35 29 47 21 60 21C73 21 85 29 85 50Z"/><rect x="31" y="45" width="58" height="11" rx="5.5" ${o(c)}/><path d="M42 47V54M50 47V54M58 47V54M66 47V54M74 47V54" ${line(1.2)} opacity=".35"/><circle cx="60" cy="19" r="5.5" ${o(c)}/>`,
  cap: (c) => `<path ${o(c)} d="M37 51C37 32 48 25 60 25C72 25 83 32 83 51Z"/><path ${o(c)} d="M36 50C52 45 76 46 94 53C94 57 88 58 82 56C66 51 50 51 36 55Z"/><circle cx="60" cy="25.5" r="2" fill="${INK}"/>`,
  bucket: (c) => `<path ${o(c)} d="M37 49C37 31 46 24 60 24C74 24 83 31 83 49Z"/><path ${o(c)} d="M27 53C33 44.5 87 44.5 93 53C93 57.5 86 59 60 58C34 59 27 57.5 27 53Z"/><path d="M38 45.5C50 43 70 43 82 45.5" ${line(1.2)} opacity=".35"/>`,
  cowboy: (c) => `<path ${o(c)} d="M41 46C40 31 46 23 53 26C56 27.5 64 27.5 67 26C74 23 80 31 79 46Z"/><path ${o(c)} d="M22 45C27 55 93 55 98 45C98 41.5 93 40.5 88 43C77 49 43 49 32 43C27 40.5 22 41.5 22 45Z"/><path d="M41.5 42.5C52 45 68 45 78.5 42.5" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".5"/>`,
  party: (c) => `<g transform="rotate(14 60 36)"><path ${o(c)} d="M48 37L60 6L72 37Z"/>${[[57, 19], [63, 27], [55, 31], [66, 34], [60, 13]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff" opacity=".9"/>`).join("")}<circle cx="60" cy="5.5" r="4" ${o("#f3c74a")}/></g>`,
  halo: () => `<ellipse cx="60" cy="14" rx="17.5" ry="4.8" fill="none" stroke="#f7d154" stroke-width="9" opacity=".25"/>${ring("M42.5 14A17.5 4.8 0 1 0 77.5 14A17.5 4.8 0 1 0 42.5 14", "#f7d154", 2.8)}`,
  horns: () => `<path ${o("#e5484d")} d="M45.5 39C40 32 39.5 24 43 17C45 25 49.5 29.5 54 33Z"/><path ${o("#e5484d")} d="M74.5 39C80 32 80.5 24 77 17C75 25 70.5 29.5 66 33Z"/><path d="M43.5 23Q45 28 48 31" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".45"/>`,
  unicorn: (c) => BAND(c) + `<path ${o("#ffe3f3")} d="M54 36L60 5.5L66 36Z"/><path d="M55.3 30L64.3 27.5M56.5 23.5L63 21.5M57.8 17L61.8 15.8M58.8 11.5L60.8 10.9" fill="none" stroke="#c77dff" stroke-width="1.4" stroke-linecap="round"/>`,
  cat: (c) => BAND(c) + `<path ${o(c)} d="M38 43L36.5 18.5L54 31Z"/><path ${o(c)} d="M82 43L83.5 18.5L66 31Z"/><path d="M40.5 37L40 25.5L49 31.8ZM79.5 37L80 25.5L71 31.8Z" fill="#ff9fc4"/>`,
  bunny: (c) => BAND(c) + `<ellipse cx="49" cy="17" rx="6" ry="16.5" transform="rotate(-12 49 17)" ${o("#fff")}/><ellipse cx="49" cy="18" rx="2.8" ry="11" transform="rotate(-12 49 18)" fill="#ffb3cf"/><ellipse cx="71" cy="17" rx="6" ry="16.5" transform="rotate(12 71 17)" ${o("#fff")}/><ellipse cx="71" cy="18" rx="2.8" ry="11" transform="rotate(12 71 18)" fill="#ffb3cf"/>`,
  bear: (c) => BAND(c) + `<circle cx="40" cy="33" r="8" ${o(c)}/><circle cx="80" cy="33" r="8" ${o(c)}/><circle cx="40" cy="33" r="3.6" fill="#ffb3cf"/><circle cx="80" cy="33" r="3.6" fill="#ffb3cf"/>`,
  flowers: () => FLOWERS.map(([x, y, c]) =>
    [0, 72, 144, 216, 288].map((a) => { const r = (a * Math.PI) / 180; return `<circle cx="${(x + 3.2 * Math.cos(r)).toFixed(2)}" cy="${(y + 3.2 * Math.sin(r)).toFixed(2)}" r="2.9" ${o(c, 'stroke-width="1.1"')}/>`; }).join("")
    + `<circle cx="${x}" cy="${y}" r="1.9" ${o("#fff4b8", 'stroke-width="1"')}/>`).join(""),
};
const HATS = new Set(["beanie", "cap", "bucket", "cowboy"]);

const EARRING: Record<string, string> = {
  none: "",
  gold: `<circle cx="38" cy="71" r="2.6" fill="none" stroke="${INK}" stroke-width="3.6"/><circle cx="38" cy="71" r="2.6" fill="none" stroke="${GOLD}" stroke-width="1.8"/>`,
  stud: `<circle cx="38" cy="68.6" r="1.9" fill="${GEM}" stroke="${INK}" stroke-width="1"/>`,
  blunt: tube("M25.5 60.5L42 54", "#8a5a33", 4) + tube("M39.2 55.1L42 54", "#efe4cc", 4) + `<path d="M29.4 57.9L30.6 60.3M33.2 56.4L34.4 58.8M36.8 55L38 57.4" stroke="#5c3a1f" stroke-width="1" stroke-linecap="round" opacity=".7"/>`,
  pencil: tube("M29 59L42 54", "#f3c74a", 4) + tube("M39.8 54.8L42 54", "#ff9fb0", 4) + `<path d="M27.9 56.9L23.3 61.2L29.7 61.3Z" ${o("#f4d7a8", 'stroke-width="1.3"')}/><path d="M25 59.7L23.3 61.2L25.7 61.2Z" fill="${INK}"/>`,
};

const SH = "M16 170V124C16 101 35 91 60 91C85 91 104 101 104 124V170Z";
const VN = `<path d="M50 91.5Q60 101 70 91.5" ${line(1.8)}/>`;
const COLLAR = (c: string) => `<path d="M60 96V170" ${line(1.5)}/><circle cx="60" cy="105" r="1.4" fill="${INK}"/><circle cx="60" cy="114" r="1.4" fill="${INK}"/><path ${o(c, 'stroke-width="1.6"')} d="M50.5 91L60 96.5L54.5 102Z"/><path ${o(c, 'stroke-width="1.6"')} d="M69.5 91L60 96.5L65.5 102Z"/>`;
const light = (c: string) => ["#f4f2ec", "#f3c74a"].includes(c);
const clipped = (id: string, inner: string) => `<g clip-path="url(#${id}t)">${inner}</g>`;
const TOP_BACK: PartMap = {
  hoodie: (c) => `<path ${o(c)} d="M36.5 102C35.5 86 46 80.5 60 80.5C74 80.5 84.5 86 83.5 102Z"/>`,
};
const TOP: PartMap = {
  tee: (c) => `<path ${o(c)} d="${SH}"/>${VN}`,
  tank: (c, s) => `<path ${o(s)} d="${SH}"/><path ${o(c)} d="M38 170V104C38 99 41 95.5 44.5 93.5C49 100.5 71 100.5 75.5 93.5C79 95.5 82 99 82 104V170Z"/>`,
  button: (c) => `<path ${o(c)} d="${SH}"/>${COLLAR(c)}`,
  hoodie: (c) => `<path ${o(c)} d="${SH}"/>${VN}<path d="M55.5 97.5V109M64.5 97.5V109" ${line(1.5)}/><circle cx="55.5" cy="110" r="1.3" fill="${INK}"/><circle cx="64.5" cy="110" r="1.3" fill="${INK}"/>`,
  aloha: (c, s, id) => `<path ${o(c)} d="${SH}"/>` + clipped(id, [[30, 110], [44, 101], [50, 119], [73, 104], [88, 113], [66, 121], [36, 124], [95, 124], [80, 126]].map(([x, y], i) =>
    [[0, -2.6], [2.6, 0], [0, 2.6], [-2.6, 0]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="2.4" fill="${light(c) ? RAVE[i % 3] : "#fff"}" opacity=".8"/>`).join("") + `<circle cx="${x}" cy="${y}" r="1.2" fill="#f3c74a"/>`).join("")) + `<path d="${SH}" fill="none" stroke="${INK}" stroke-width="1.8"/>${COLLAR(c)}`,
  stripes: (c, s, id) => `<path ${o(c)} d="${SH}"/>` + clipped(id, [100, 107, 114, 121, 128].map((y) => `<path d="M10 ${y}H110" stroke="${light(c) ? "#1f2033" : "#fff"}" stroke-width="3.2" opacity="${light(c) ? ".75" : ".5"}"/>`).join("")) + `<path d="${SH}" fill="none" stroke="${INK}" stroke-width="1.8"/>${VN}`,
  band: (c) => `<path ${o(c)} d="${SH}"/>${VN}<path ${o("#f3c74a", 'stroke-width="1.4"')} d="M63 101L54.5 112H60L56.5 121.5L67 109H61.2Z"/>`,
  tiedye: (c, s, id) => `<path ${o(c)} d="${SH}"/>` + clipped(id, [44, 36, 28, 20, 12, 5].map((r, i) => `<circle cx="60" cy="112" r="${r}" fill="${RAVE[i % 5]}" opacity=".9"/>`).join("")) + `<path d="${SH}" fill="none" stroke="${INK}" stroke-width="1.8"/>${VN}`,
};
const NECK_BACK: PartMap = {
  phones: (g) => tube("M45 96C45 83.5 75 83.5 75 96", g, 3.6),
};
const kandi: Part = () => Array.from({ length: 9 }, (_, i) => {
  const t = i / 8, x = (1 - t) ** 2 * 48.5 + 2 * (1 - t) * t * 60 + t * t * 71.5, y = (1 - t) ** 2 * 93 + 2 * (1 - t) * t * 108 + t * t * 93;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="${RAVE[i % 5]}" stroke="${INK}" stroke-width="1"/>`;
}).join("");
const NECK: PartMap = {
  none: nil,
  chain: () => `<path d="M49.5 93Q60 107 70.5 93" fill="none" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/><path d="M49.5 93Q60 107 70.5 93" fill="none" stroke="${GOLD}" stroke-width="2.6" stroke-linecap="round"/><path d="M49.5 93Q60 107 70.5 93" fill="none" stroke="${GOLD_D}" stroke-width="2.6" stroke-dasharray="1.1 1.7"/><circle cx="60" cy="104" r="3.6" ${o(GOLD, 'stroke-width="1.4"')}/><path d="M58.6 102.6L59.6 102.2" stroke="#fff" stroke-width="1" stroke-linecap="round"/>`,
  kandi,
  phones: (g) => `<ellipse cx="45" cy="97.5" rx="6.8" ry="7.8" ${o(g)}/><ellipse cx="75" cy="97.5" rx="6.8" ry="7.8" ${o(g)}/><ellipse cx="45" cy="97.5" rx="3.2" ry="4.2" fill="${INK}" opacity=".3"/><ellipse cx="75" cy="97.5" rx="3.2" ry="4.2" fill="${INK}" opacity=".3"/>`,
  whistle: (g) => ring("M51 92.5L58.5 106.5M69 92.5L61.5 106.5", g, 1.8) + `<rect x="54.5" y="105.5" width="11.5" height="7" rx="3.5" ${o(SILVER, 'stroke-width="1.4"')}/><rect x="64.5" y="104.2" width="5" height="3.8" rx="1.1" ${o(SILVER, 'stroke-width="1.2"')}/><circle cx="58.8" cy="109" r="1.4" fill="${INK}"/>`,
};

/* Close-up crop per option row so small details are visible in the builder. */
export const FOCUS: Record<string, string> = {
  hair: "16 10 88 88", head: "10 -2 100 100",
  eyes: "36 42 48 48", eyewear: "35 41 50 50", paint: "34 36 52 52",
  mouth: "38 54 44 44", facial: "32 48 56 56", cover: "32 50 56 56", nose: "43 54 34 34",
  ears: "16 36 52 52", earring: "18 38 48 48",
  top: "20 66 80 80", neck: "30 72 60 60",
};

/* Parts that would hide the thing a row previews. */
const UNBLOCK: Record<string, Record<string, [string | null, string]>> = {
  earring: { head: ["headphones", "none"] }, ears: { head: ["headphones", "none"] },
  eyes: { eyewear: [null, "none"] }, mouth: { cover: [null, "none"], eyewear: [null, "none"] }, facial: { cover: [null, "none"] }, nose: { cover: [null, "none"], eyewear: [null, "none"] },
};
export function previewAvatar(d: AvatarSettings, key: string, v: string): AvatarSettings {
  const a = { ...d, [key]: v };
  for (const [k, [when, to]] of Object.entries(UNBLOCK[key] || {})) if (when == null || a[k] === when) a[k] = to;
  return a;
}

const safeId = (uid: string) => String(uid).replace(/[^a-zA-Z0-9_-]/g, "_");

/** First and last initial. One name uses its first letter. */
export function initialsFor(name = ""): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

export function avatarMono(name = "", bg = ACC_SOFT): string {
  const ini = initialsFor(name).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  return `<svg class="avs avs-mono" viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" fill="${bg}"/><text x="60" y="62" text-anchor="middle" dominant-baseline="central" font-family="Geist, system-ui, sans-serif" font-weight="600" font-size="${ini.length > 1 ? 44 : 52}" letter-spacing="-2" fill="${INK}">${ini}</text><circle cx="89" cy="31" r="7.5" fill="${ACC}"/></svg>`;
}

/**
 * `view`: omitted for the full round avatar, `true` for the default face crop,
 * or a viewBox string (see FOCUS). Cropped views skip the circular clip.
 */
export function avatarSvg(a: AvatarSettings, uid: string, view?: string | boolean): string {
  const id = `avc${safeId(uid)}`;
  const hc = a.hairColor, g = a.gear, noFront = HATS.has(a.head), top = TOP[a.top] || TOP.tee;
  const vb = view === true ? "18 12 84 84" : view || "0 0 120 120";
  return `<svg class="avs avs-illustrated" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="60" cy="60" r="60"/></clipPath><clipPath id="${id}t"><path d="${SH}"/></clipPath></defs><g${view ? "" : ` clip-path="url(#${id})"`}>
      <rect class="av-bg" x="-20" y="-20" width="160" height="200" fill="${a.bg}"/>
      <g class="av-fig">
      ${(HAIR_NAPE[a.hair] || nil)(hc, a.skin, id)}
      ${(TOP_BACK[a.top] || nil)(a.shirt, a.skin, id)}
      ${(NECK_BACK[a.neck] || nil)(g, a.skin, id)}
      <path ${o(a.skin)} d="M52 77V91C52 96 68 96 68 91V77Z"/>
      ${top(a.shirt, a.skin, id)}
      ${(NECK[a.neck] || nil)(g, a.skin, id)}
      ${(HAIR_BACK[a.hair] || nil)(hc, a.skin, id)}
      ${(EARS[a.ears] || EARS.round)(a.skin, a.skin, id)}
      <ellipse cx="60" cy="60" rx="22.5" ry="25.5" ${o(a.skin)}/>
      <ellipse cx="45.5" cy="69" rx="4" ry="2.4" fill="#ff8f8f" opacity=".28"/><ellipse cx="74.5" cy="69" rx="4" ry="2.4" fill="#ff8f8f" opacity=".28"/>
      ${(FACIAL[a.facial] || nil)(hc, a.skin, id)}
      ${noFront ? "" : (HAIR_FRONT[a.hair] || nil)(hc, a.skin, id)}
      ${PAINT[a.paint] || ""}
      <path d="M47 54Q51 51.8 55 53.6M65 53.6Q69 51.8 73 54" ${line(2)}/>
      ${EYES[a.eyes] || EYES.dots}
      ${(NOSE[a.nose] || NOSE.classic)(a.skin, a.skin, id)}
      ${STACHE[a.facial] ? `<g transform="translate(0 2.5)">${MOUTH[a.mouth] || MOUTH.smile}</g>${STACHE[a.facial](hc, a.skin, id)}` : MOUTH[a.mouth] || MOUTH.smile}
      ${(COVER[a.cover] || nil)(g, a.skin, id)}
      ${EYEWEAR[a.eyewear] || ""}
      ${(HEAD[a.head] || nil)(g, a.skin, id)}
      ${a.head !== "headphones" ? EARRING[a.earring] || "" : ""}
    </g></g></svg>`;
}

function rng(seed: string | number) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}
const SPARSE: Record<string, number> = { facial: 0.5, head: 0.45, eyewear: 0.6, earring: 0.6, ears: 0.8, paint: 0.7, nose: 0.35, cover: 0.85, neck: 0.6 };
function random(seed: string | number = Math.random()): AvatarSettings {
  const r = rng(seed), pick = (arr: string[]) => arr[Math.floor(r() * arr.length)];
  const a: AvatarSettings = {};
  for (const k of Object.keys(PAL)) a[k] = pick(PAL[k]);
  for (const k of Object.keys(OPTS)) a[k] = pick(OPTS[k]);
  for (const [k, p] of Object.entries(SPARSE)) if (r() < p) a[k] = OPTS[k][0];
  return a;
}

export function randomAvatar(seed?: number): AvatarSettings {
  return random(seed ?? Math.random());
}

export const DEFAULT_AVATAR: Readonly<AvatarSettings> = Object.freeze({
  skin: PAL.skin[1], hairColor: PAL.hairColor[1], shirt: PAL.shirt[0], gear: PAL.gear[3], bg: PAL.bg[0],
  hair: "short", eyes: "dots", mouth: "smile", facial: "stubble", head: "none", eyewear: "none", earring: "none",
  ears: "round", paint: "none", nose: "classic", cover: "none", top: "tee", neck: "none",
});

/** Null if `input` isn't an object; otherwise DEFAULT_AVATAR overlaid with the valid known values. */
export function cleanAvatar(input: unknown): AvatarSettings | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const src = input as Record<string, unknown>;
  const a: AvatarSettings = {};
  for (const k of Object.keys(OPTS)) {
    const v = src[k];
    a[k] = typeof v === "string" && OPTS[k].includes(v) ? v : DEFAULT_AVATAR[k];
  }
  for (const k of Object.keys(PAL)) {
    const v = k in src ? src[k] : DEFAULT_AVATAR[k];
    a[k] = typeof v === "string" && PAL[k].includes(v) ? v : nearest(v, PAL[k]);
  }
  return a;
}

/** Deterministic avatar for someone who hasn't made one. */
export function avatarForName(name: string, uid: string): string {
  return avatarSvg(random(name), uid);
}

export const TABS: Record<string, [label: string, key: string, kind?: "color"][]> = {
  face: [["Skin", "skin", "color"], ["Eyes", "eyes"], ["Mouth", "mouth"], ["Nose", "nose"], ["Facial hair", "facial"], ["Ears", "ears"]],
  hair: [["Style", "hair"], ["Color", "hairColor", "color"]],
  head: [["Headwear", "head"], ["Gear color", "gear", "color"]],
  extras: [["Glasses", "eyewear"], ["Face paint", "paint"], ["Ear", "earring"], ["Face cover", "cover"], ["Gear color", "gear", "color"]],
  outfit: [["Top", "top"], ["Shirt color", "shirt", "color"], ["Neck", "neck"], ["Background", "bg", "color"]],
};
export const TAB_NAMES: [key: string, label: string][] = [["face", "Face"], ["hair", "Hair"], ["head", "Head"], ["extras", "Extras"], ["outfit", "Outfit"]];
