// node ads.mjs <workDir>  — writes <name>.html for every variant into workDir.
// Each page exposes window.seek(t) (seconds) that deterministically renders the
// frame at time t, for frame capture. Masters: midi-cello / takes-cello.
// Variants change instrument words only — add one by adding a line below.
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const OUT = process.argv[2];
if (!OUT) throw new Error("usage: node ads.mjs <workDir>");
const { avatarSvg, cleanAvatar } = await import(pathToFileURL(path.join(REPO, "lib/avatar.ts")).href);
const FONT = pathToFileURL(path.join(REPO, "node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2")).href;

const IRIS = "#7B61FF", GRAY = "#D3D1CA", NOTE = "#BDBBB4";

export const MIDI_VARIANTS = {
  "midi-cello":  { instrument: "Cello",  line1: "Your MIDI cello",  verb: "isn't",  tag: "MIDI", players: "cellists" },
  "midi-guitar": { instrument: "Guitar", line1: "Your MIDI guitar", verb: "isn't",  tag: "MIDI", players: "guitarists" },
  "midi-drums":  { instrument: "Drums",  line1: "Your MIDI drums",  verb: "aren't", tag: "MIDI", players: "drummers" },
  "ai-vocals":   { instrument: "Vocals", line1: "Your AI vocals",   verb: "aren't", tag: "AI",   players: "singers" },
  "midi-bass":   { instrument: "Bass",   line1: "Your MIDI bass",   verb: "isn't",  tag: "MIDI", players: "bassists" },
};
export const TAKES_VARIANTS = {
  "takes-cello":  { instrument: "Cello" },
  "takes-guitar": { instrument: "Guitar" },
  "takes-drums":  { instrument: "Drums" },
  "takes-vocals": { instrument: "Vocals" },
  "takes-bass":   { instrument: "Bass" },
};

const BADGE = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 48 48" overflow="visible" aria-hidden="true">
  <circle cx="24" cy="24" r="22" fill="#111113" transform="translate(2.6 2.6)"/>
  <circle cx="24" cy="24" r="22" fill="${IRIS}"/>
  <g transform="translate(9.25 5.25) scale(.75)">
    <path d="M7 13h2.5a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2z" fill="#fff"/>
    <path d="M14 25L35 13L35 37Z" fill="#fff" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/>
  </g>
</svg>`;
const WORDMARK = `<div class="wm">${BADGE(44)}<span>Retrack <b>This</b></span></div>`;
const STAR = `<svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.1l.9-5.4L4.2 8.9l5.4-.8L12 3.2z"/></svg>`;

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const avatar = (settings, uid, size) =>
  `<span class="av" style="width:${size}px;height:${size}px">${avatarSvg(cleanAvatar(settings), uid)}</span>`;

const AV = {
  nora: { skin: "#dea47c", hair: "bun", hairColor: "#4a2f22", eyes: "happy", mouth: "smile", facial: "none", earring: "gold", top: "tee", shirt: "#604cc7", bg: "#f8efcf" },
  theo: { skin: "#bb7c51", hair: "curly", hairColor: "#1c1a1f", eyes: "dots", mouth: "calm", facial: "stubble", head: "headphones", gear: "#1f2033", top: "hoodie", shirt: "#7fae8e", bg: "#e2f0e6" },
  june: { skin: "#fbe0cb", hair: "swoop", hairColor: "#c4572a", eyes: "dots", mouth: "smile", facial: "none", eyewear: "round", top: "button", shirt: "#7fa6d6", bg: "#e0eaf6" },
};

const CSS = `
@font-face { font-family: "Geist"; src: url("${FONT}") format("woff2"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1080px; height: 1350px; overflow: hidden; }
body { background: #F3F2EE; color: #111113; font-family: "Geist", system-ui, sans-serif; font-weight: 500;
  -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }
.post { width: 1080px; height: 1350px; padding: 112px 96px; display: flex; flex-direction: column; }
.wm { display: inline-flex; align-items: center; gap: 16px; font-size: 28px; font-weight: 600; letter-spacing: -0.04em; line-height: 1; }
.wm b { font-weight: 600; color: ${IRIS}; }
.wm svg { overflow: visible; flex: none; }
h1 { margin-top: 72px; font-size: 76px; line-height: 1.02; font-weight: 600; letter-spacing: -0.04em; }
.stage { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.card { background: #fff; border-radius: 32px;
  box-shadow: 0 0 0 1px rgba(17,17,19,.07), 0 2px 4px rgba(17,17,19,.03), 0 24px 48px -28px rgba(17,17,19,.22); }
.muted { color: #76767C; }
.title { font-size: 30px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.1; }
.title .dot { color: #A9A9AE; font-weight: 500; }
.pill { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 18px; border-radius: 999px;
  font-size: 20px; font-weight: 500; letter-spacing: -0.01em; white-space: nowrap; }
.stack { display: grid; } .stack > * { grid-area: 1 / 1; }
.av { display: block; border-radius: 50%; overflow: hidden; flex: none; }
.av svg { width: 100%; height: 100%; display: block; }
.cta { display: flex; align-items: center; gap: 28px; }
.btn { display: inline-flex; align-items: center; height: 68px; padding: 0 34px; border-radius: 999px;
  background: #111113; color: #fff; font-size: 24px; font-weight: 500; letter-spacing: -0.01em;
  box-shadow: 0 1px 0 rgba(255,255,255,.15) inset, 0 8px 20px -8px rgba(17,17,19,.55); }
`;

const RUNTIME = `
const clamp = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const easeInOut = (x) => { x = clamp(x); return x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2; };
const $ = (id) => document.getElementById(id);
function show(el, p, dy = 20) { el.style.opacity = p; el.style.transform = 'translateY(' + ((1 - p) * dy).toFixed(2) + 'px)'; }
`;

function page(body, script) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}
<script>${RUNTIME}${script}; seek(0);</script></body></html>`;
}

// ================= Series B: MIDI → real take =================

const ROLL_W = 808, ROLL_H = 240, STEPS = 16, LANES = 8;
const STEP = ROLL_W / STEPS, LANE = ROLL_H / LANES;
const NOTES = [[0, 3, 5], [3, 1, 4], [4, 2, 3], [6, 2, 4], [8, 4, 2], [12, 1, 3], [13, 1, 4], [14, 2, 6]];

const BAR = 8, GAP = 4, MAXH = 210;
const NBARS = Math.floor((ROLL_W + GAP) / (BAR + GAP));
const rand1 = seeded(2024);
const bars = Array.from({ length: NBARS }, (_, i) => {
  const x = i * (BAR + GAP);
  const step = (x + BAR / 2) / STEP;
  let a = 0.14;
  for (const [s, l] of NOTES) {
    if (step >= s && step < s + l) {
      const u = (step - s) / l;
      a = Math.max(a, 0.5 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.25 + 0.15)));
    } else if (step >= s + l && step < s + l + 0.6) {
      a = Math.max(a, 0.35 * (1 - (step - s - l) / 0.6));
    }
  }
  const h = Math.max(BAR, a * (0.72 + 0.28 * rand1()) * MAXH);
  return { x, h: +h.toFixed(1) };
});

const grid = [
  ...Array.from({ length: LANES - 1 }, (_, i) => `<rect x="0" y="${(i + 1) * LANE}" width="${ROLL_W}" height="1" fill="rgba(17,17,19,.05)"/>`),
  ...Array.from({ length: STEPS - 1 }, (_, i) =>
    `<rect x="${(i + 1) * STEP}" y="0" width="1" height="${ROLL_H}" fill="rgba(17,17,19,${(i + 1) % 4 === 0 ? 0.08 : 0.035})"/>`),
].join("");
const noteRects = NOTES.map(([s, l, lane]) =>
  `<rect x="${s * STEP + 3}" y="${lane * LANE + 5}" width="${l * STEP - 6}" height="${LANE - 10}" rx="6" fill="${NOTE}"/>`).join("");
const barRects = bars.map((b, i) =>
  `<rect id="b${i}" x="${b.x}" y="${ROLL_H / 2}" width="${BAR}" height="0" rx="${BAR / 2}" fill="${IRIS}"/>`).join("");

function midiAd(v) {
  return page(
  `<div class="post">
    ${WORDMARK}
    <h1>${v.line1}<br>${v.verb} fooling anyone.</h1>
    <div class="stage">
      <div class="card" style="padding:36px 40px 40px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div class="title">Golden Hour <span class="dot">·</span> ${v.instrument}</div>
            <div class="stack" style="margin-top:8px;font-size:20px;letter-spacing:-0.01em">
              <span id="subA" class="muted">${v.tag} placeholder</span>
              <span id="subB" class="muted" style="display:flex;align-items:center;gap:10px">
                ${avatar(AV.nora, "a1", 28)}Nora Whitfield · real take
              </span>
            </div>
          </div>
          <div class="stack" style="justify-items:end">
            <span id="chipA" class="pill" style="background:#F5F4F1;color:#76767C">${v.tag}</span>
            <span id="chipB" class="pill" style="background:#F3F1FF;color:${IRIS}">Real take</span>
          </div>
        </div>
        <svg width="${ROLL_W}" height="${ROLL_H}" viewBox="0 0 ${ROLL_W} ${ROLL_H}" style="display:block;margin-top:32px;overflow:visible">
          <defs><clipPath id="nc"><rect id="clip" x="0" y="-10" width="${ROLL_W}" height="${ROLL_H + 20}"/></clipPath></defs>
          <g id="grid">${grid}</g>
          <g clip-path="url(#nc)">${noteRects}</g>
          <g>${barRects}</g>
          <g id="ph"><rect x="-1" y="-6" width="2" height="${ROLL_H + 12}" rx="1" fill="${IRIS}"/><circle cx="0" cy="-8" r="6" fill="${IRIS}"/></g>
        </svg>
      </div>
      <div id="cta" class="cta" style="margin-top:44px">
        <span class="btn">Post your part</span>
        <span style="font-size:24px;letter-spacing:-0.015em;color:#3B3B40;line-height:1.3">Real ${v.players} send takes.<br>You pick your favorite.</span>
      </div>
    </div>
  </div>`,
  `
  const BARS = ${JSON.stringify(bars)}, W = ${ROLL_W}, H = ${ROLL_H};
  const SWEEP_START = 0.9, SWEEP_END = 3.9;
  function seek(t) {
    const f = W * easeInOut((t - SWEEP_START) / (SWEEP_END - SWEEP_START));
    $('clip').setAttribute('x', f.toFixed(2));
    $('clip').setAttribute('width', (W - f + 2).toFixed(2));
    BARS.forEach((b, i) => {
      const p = easeOut((f - b.x) / 70);
      const h = b.h * p;
      const r = $('b' + i);
      r.setAttribute('height', h.toFixed(2));
      r.setAttribute('y', (H / 2 - h / 2).toFixed(2));
    });
    const phIn = clamp((t - SWEEP_START + 0.25) / 0.25), phOut = 1 - clamp((t - SWEEP_END) / 0.3);
    $('ph').setAttribute('transform', 'translate(' + f.toFixed(2) + ' 0)');
    $('ph').style.opacity = Math.min(phIn, phOut);
    $('grid').style.opacity = 1 - 0.6 * clamp((t - SWEEP_END) / 0.4);
    const swap = easeOut((t - 4.0) / 0.4);
    $('subA').style.opacity = $('chipA').style.opacity = 1 - swap;
    $('subB').style.opacity = $('chipB').style.opacity = swap;
    show($('cta'), easeOut((t - 4.5) / 0.5));
  }`
  );
}

// ================= Series A: takes arrive, one gets favorited =================

const MW = 210, MBAR = 4, MGAP = 3, MH = 44;
const MN = Math.floor((MW + MGAP) / (MBAR + MGAP));
function miniPeaks(seed) {
  const r = seeded(seed);
  return Array.from({ length: MN }, (_, i) => {
    const t = i / MN;
    const h = (0.45 + 0.55 * Math.sin(t * Math.PI * 2.4 + seed) ** 2) * (0.6 + 0.4 * r());
    return Math.max(MBAR, +(h * MH).toFixed(1));
  });
}
const mini = (id, peaks) =>
  `<svg width="${MN * (MBAR + MGAP) - MGAP}" height="${MH}">${peaks
    .map((h, i) => `<rect id="${id}${i}" x="${i * (MBAR + MGAP)}" y="${((MH - h) / 2).toFixed(1)}" width="${MBAR}" height="${h}" rx="2" fill="${GRAY}"/>`)
    .join("")}</svg>`;

const PEOPLE = [
  { key: "theo", name: "Theo Castellanos", takes: "2 takes", seed: 11 },
  { key: "nora", name: "Nora Whitfield", takes: "2 takes", seed: 23 },
  { key: "june", name: "June Park", takes: "1 take", seed: 37 },
];
const takeRows = PEOPLE.map((p, i) => `
  <div id="row${i}" class="card trow">
    ${avatar(AV[p.key], `r${i}`, 56)}
    <div style="flex:1;display:flex;flex-direction:column;gap:4px">
      <strong style="font-size:23px;font-weight:500;letter-spacing:-0.015em">${p.name}</strong>
      <span class="muted" style="font-size:18px">${p.takes}</span>
    </div>
    ${mini(`w${i}_`, miniPeaks(p.seed))}
    <span id="fav${i}" class="pill fav">${STAR}Favorite</span>
  </div>`).join("");

function takesAd(v) {
  return page(
  `<div class="post">
    ${WORDMARK}
    <h1>Post the part.<br>The takes come to you.</h1>
    <div class="stage">
      <div class="card" style="padding:30px 36px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div class="title">Golden Hour <span class="dot">·</span> ${v.instrument}</div>
            <div class="muted" style="margin-top:8px;font-size:20px;letter-spacing:-0.01em">84 BPM · D minor · 1:02 excerpt</div>
          </div>
          <div style="display:flex;gap:10px">
            <span class="pill" style="background:#111113;color:#fff;font-weight:600">$180</span>
            <span class="pill" style="background:#F5F4F1;color:#3B3B40">3 days left</span>
          </div>
        </div>
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(17,17,19,.07);display:flex;justify-content:space-between;font-size:21px">
          <span class="muted">Takes in</span>
          <span id="count" style="font-weight:600;letter-spacing:-0.01em;font-variant-numeric:tabular-nums">None yet</span>
        </div>
      </div>
      <div style="margin-top:20px;display:flex;flex-direction:column;gap:14px">${takeRows}</div>
      <div id="cta" class="cta" style="margin-top:40px">
        <span class="btn">Post your part</span>
        <span style="font-size:24px;letter-spacing:-0.015em;color:#3B3B40;line-height:1.3">Musicians submit for free.<br>You pick your favorite.</span>
      </div>
    </div>
  </div>`,
  `
  const MN = ${MN}, ARRIVE = [0.5, 1.5, 2.5], COUNTS = ['2 takes', '4 takes', '5 takes'];
  const PLAY_ROW = 1, PLAY_START = 3.3, PLAY_END = 4.8, FAV_AT = 5.0;
  function seek(t) {
    ARRIVE.forEach((a, i) => show($('row' + i), easeOut((t - a) / 0.45), 28));
    let c = 'None yet';
    ARRIVE.forEach((a, i) => { if (t >= a + 0.15) c = COUNTS[i]; });
    $('count').textContent = c;
    const played = clamp((t - PLAY_START) / (PLAY_END - PLAY_START)) * MN;
    for (let i = 0; i < MN; i++) $('w' + PLAY_ROW + '_' + i).setAttribute('fill', i < played ? '${IRIS}' : '${GRAY}');
    const fp = clamp((t - FAV_AT) / 0.35);
    const pop = fp > 0 && fp < 1 ? 1 + 0.08 * Math.sin(fp * Math.PI) : 1;
    const fav = $('fav' + PLAY_ROW);
    fav.classList.toggle('on', t >= FAV_AT);
    fav.style.transform = 'scale(' + pop.toFixed(3) + ')';
    $('row' + PLAY_ROW).style.background = t >= FAV_AT
      ? 'color-mix(in srgb, #F3F1FF ' + Math.round(easeOut(fp) * 100) + '%, #fff)' : '#fff';
    show($('cta'), easeOut((t - 5.5) / 0.5));
  }`
  ).replace("</style>", `
.trow { display: flex; align-items: center; gap: 20px; height: 96px; padding: 0 20px 0 18px; border-radius: 26px; }
.fav { height: 42px; padding: 0 16px 0 13px; font-size: 19px; background: #F5F4F1; color: #3B3B40; }
.fav svg { width: 18px; height: 18px; fill: none; stroke: currentColor; }
.fav.on { background: ${IRIS}; color: #fff; }
.fav.on svg { fill: #fff; stroke: #fff; }
</style>`);
}

for (const [name, v] of Object.entries(MIDI_VARIANTS)) writeFileSync(path.join(OUT, `${name}.html`), midiAd(v));
for (const [name, v] of Object.entries(TAKES_VARIANTS)) writeFileSync(path.join(OUT, `${name}.html`), takesAd(v));
console.log([...Object.keys(MIDI_VARIANTS), ...Object.keys(TAKES_VARIANTS)].join(" "));
