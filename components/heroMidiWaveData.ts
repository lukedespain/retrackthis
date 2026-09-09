/** Live data for the three-stage homepage hero (post → takes → pick). */

export const STRIP_WIDTH = 800;

export const MIDI_LANES = [16, 30, 44, 58, 72, 86];

type MidiNote = {
  id: string;
  x: number;
  lane: number;
  w: number;
  opacity: number;
};

export const MIDI_NOTES: MidiNote[] = [
  { id: "n0", x: 18, lane: 30, w: 36, opacity: 0.92 },
  { id: "n1", x: 64, lane: 58, w: 22, opacity: 0.75 },
  { id: "n2", x: 102, lane: 44, w: 50, opacity: 0.95 },
  { id: "n3", x: 168, lane: 16, w: 28, opacity: 0.7 },
  { id: "n4", x: 210, lane: 72, w: 42, opacity: 0.88 },
  { id: "n5", x: 268, lane: 44, w: 18, opacity: 0.65 },
  { id: "n6", x: 300, lane: 30, w: 54, opacity: 0.9 },
  { id: "n7", x: 372, lane: 86, w: 26, opacity: 0.72 },
  { id: "n8", x: 414, lane: 58, w: 38, opacity: 0.88 },
  { id: "n9", x: 468, lane: 16, w: 20, opacity: 0.7 },
  { id: "n10", x: 504, lane: 44, w: 46, opacity: 0.94 },
  { id: "n11", x: 566, lane: 72, w: 32, opacity: 0.8 },
  { id: "n12", x: 616, lane: 30, w: 24, opacity: 0.68 },
  { id: "n13", x: 656, lane: 58, w: 40, opacity: 0.9 },
  { id: "n14", x: 720, lane: 86, w: 28, opacity: 0.76 },
  { id: "n15", x: 40, lane: 86, w: 16, opacity: 0.55 },
  { id: "n16", x: 340, lane: 16, w: 14, opacity: 0.58 },
  { id: "n17", x: 760, lane: 44, w: 22, opacity: 0.82 },
];

/** Deterministic 0–1 noise (seamless-friendly). */
function hash01(i: number, seed: number) {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Build a denser DAW-style peak train: irregular transients, quieter gaps,
 * slight phrase shape — not a smooth sine blob.
 */
function makeWavePeaks(
  seed: number,
  {
    count = 220,
    density = 0.72,
    punch = 0.55,
    sustain = 0.35,
    floor = 0.04,
  }: {
    count?: number;
    density?: number;
    punch?: number;
    sustain?: number;
    floor?: number;
  } = {}
): number[] {
  const peaks: number[] = [];
  let energy = 0.2;

  for (let i = 0; i < count; i++) {
    const t = i / count;
    // Soft phrase lobes so the strip feels musical, not flat noise.
    const phrase =
      0.45 +
      0.35 * Math.sin(t * Math.PI * 2.2 + seed) +
      0.2 * Math.sin(t * Math.PI * 5.1 + seed * 1.7);

    const n1 = hash01(i, seed);
    const n2 = hash01(i, seed + 17);
    const n3 = hash01(i, seed + 41);

    // Occasional hits / rests like a real take.
    const hit = n1 < density * (0.55 + 0.45 * phrase);
    if (hit) {
      energy = Math.min(1, energy * (0.4 + sustain) + n2 * punch + 0.15);
    } else {
      energy *= 0.72 + n3 * 0.12;
    }

    // High-frequency jitter so bars don’t look stepped-smooth.
    const grain = (n2 - 0.5) * 0.22;
    const amp = Math.max(floor, Math.min(1, energy * phrase + grain));
    peaks.push(amp);
  }

  // Blend ends so the scrolling loop doesn’t pop.
  const blend = Math.min(18, Math.floor(count / 10));
  for (let i = 0; i < blend; i++) {
    const w = i / blend;
    peaks[i] = peaks[i] * w + peaks[count - blend + i] * (1 - w);
  }

  return peaks;
}

/** Peak heights 0–1. Drawn as vertical DAW bars in the hero. */
export const WAVE_TAKE_A = makeWavePeaks(3.1, {
  density: 0.78,
  punch: 0.72,
  sustain: 0.28,
  floor: 0.03,
});

export const WAVE_TAKE_B = makeWavePeaks(7.4, {
  density: 0.7,
  punch: 0.58,
  sustain: 0.42,
  floor: 0.045,
});

export const WAVE_TAKE_C = makeWavePeaks(11.9, {
  density: 0.58,
  punch: 0.8,
  sustain: 0.22,
  floor: 0.025,
});

/** Index in TAKES that is the purple “chosen” take (middle of the stack). */
export const SELECTED_TAKE_INDEX = 1;

export const TAKES = [
  { id: "a", samples: WAVE_TAKE_A, selected: false },
  { id: "b", samples: WAVE_TAKE_B, selected: true },
  { id: "c", samples: WAVE_TAKE_C, selected: false },
] as const;
