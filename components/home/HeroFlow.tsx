import type { ReactNode } from "react";

const STRIP = 800;
const LANES = [16, 30, 44, 58, 72, 86];
const MIDI_NOTES: ReadonlyArray<readonly [number, number, number, number]> = [
  [18, 30, 36, 0.92], [64, 58, 22, 0.75], [102, 44, 50, 0.95], [168, 16, 28, 0.7],
  [210, 72, 42, 0.88], [268, 44, 18, 0.65], [300, 30, 54, 0.9], [372, 86, 26, 0.72],
  [414, 58, 38, 0.88], [468, 16, 20, 0.7], [504, 44, 46, 0.94], [566, 72, 32, 0.8],
  [616, 30, 24, 0.68], [656, 58, 40, 0.9], [720, 86, 28, 0.76], [40, 86, 16, 0.55],
  [340, 16, 14, 0.58], [760, 44, 22, 0.82],
];

const hash01 = (i: number, seed: number) => {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function makePeaks(
  seed: number,
  { count = 220, density = 0.72, punch = 0.55, sustain = 0.35, floor = 0.04 } = {}
) {
  const peaks: number[] = [];
  let energy = 0.2;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const phrase =
      0.45 + 0.35 * Math.sin(t * Math.PI * 2.2 + seed) + 0.2 * Math.sin(t * Math.PI * 5.1 + seed * 1.7);
    const n1 = hash01(i, seed);
    const n2 = hash01(i, seed + 17);
    const n3 = hash01(i, seed + 41);
    if (n1 < density * (0.55 + 0.45 * phrase)) energy = Math.min(1, energy * (0.4 + sustain) + n2 * punch + 0.15);
    else energy *= 0.72 + n3 * 0.12;
    peaks.push(Math.max(floor, Math.min(1, energy * phrase + (n2 - 0.5) * 0.22)));
  }
  const blend = Math.min(18, Math.floor(count / 10));
  for (let i = 0; i < blend; i++) {
    const w = i / blend;
    peaks[i] = peaks[i] * w + peaks[count - blend + i] * (1 - w);
  }
  return peaks;
}

const TAKES = [
  makePeaks(3.1, { density: 0.78, punch: 0.72, sustain: 0.28, floor: 0.03 }),
  makePeaks(7.4, { density: 0.7, punch: 0.58, sustain: 0.42, floor: 0.045 }),
  makePeaks(11.9, { density: 0.58, punch: 0.8, sustain: 0.22, floor: 0.025 }),
];

function MidiStrip() {
  return (
    <div className="midi-strip">
      {LANES.map((y) => (
        <i key={y} className="lane" style={{ top: `${y}%` }} />
      ))}
      {MIDI_NOTES.map(([x, y, w, o]) => (
        <b key={`${x}-${y}`} style={{ left: x, top: `${y}%`, width: w, opacity: o }} />
      ))}
    </div>
  );
}

function WaveStrip({ peaks, compact }: { peaks: number[]; compact: boolean }) {
  const H = compact ? 56 : 160;
  const mid = H / 2;
  const max = compact ? mid - 5 : mid - 10;
  const step = STRIP / peaks.length;
  const bw = Math.max(1.4, step * (compact ? 0.62 : 0.5));
  return (
    <svg className="wave-strip" viewBox={`0 0 ${STRIP} ${H}`} preserveAspectRatio="none">
      {peaks.map((amp, i) => {
        const j = ((i * 17 + 3) % 11) / 11;
        const top = Math.max(1.4, amp * max * (0.88 + j * 0.22));
        const bot = Math.max(1.4, amp * max * (0.78 + (1 - j) * 0.28));
        return (
          <rect
            key={i}
            x={(i * step + (step - bw) / 2).toFixed(2)}
            y={(mid - top).toFixed(2)}
            width={bw.toFixed(2)}
            height={(top + bot).toFixed(2)}
            rx={(bw / 2).toFixed(2)}
          />
        );
      })}
    </svg>
  );
}

function Loop({ children }: { children: ReactNode }) {
  return (
    <div className="loop">
      {children}
      {children}
    </div>
  );
}

function FlowDivider() {
  return (
    <div className="flow-div">
      <i />
      <em />
    </div>
  );
}

/** Hero strip: MIDI demo -> musicians' takes -> the picked take, looping left to right. */
export function HeroFlow() {
  return (
    <div className="flow" aria-hidden="true">
      <div className="flow-col midi">
        <span className="flow-k">01 · Post the part</span>
        <Loop>
          <MidiStrip />
        </Loop>
      </div>
      <FlowDivider />
      <div className="flow-col takes">
        <span className="flow-k">02 · Musicians send takes</span>
        {TAKES.map((peaks, k) => (
          <div key={k} className={`take-row${k === 1 ? " chosen" : ""}`}>
            <Loop>
              <WaveStrip peaks={peaks} compact />
            </Loop>
          </div>
        ))}
      </div>
      <FlowDivider />
      <div className="flow-col pick">
        <span className="flow-k">03 · Pick your favorite</span>
        <Loop>
          <WaveStrip peaks={TAKES[1]} compact={false} />
        </Loop>
      </div>
    </div>
  );
}
