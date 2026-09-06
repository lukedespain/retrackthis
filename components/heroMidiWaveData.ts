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

/** Take A - denser, punchier peaks (gray / not selected) */
export const WAVE_TAKE_A: number[] = [
  6, 8, 10, 14, 22, 38, 55, 48, 28, 12, 8, 6, 9, 16, 30, 50, 64, 42, 18, 9, 7, 11, 20, 34, 28, 14,
  8, 6, 10, 18, 40, 58, 52, 26, 12, 8, 7, 12, 24, 44, 60, 46, 22, 10, 7, 6, 9, 15, 26, 36, 30, 16,
  9, 7, 8, 14, 28, 48, 62, 50, 24, 11, 8, 6, 10, 19, 32, 42, 35, 18, 10, 7, 9, 17, 36, 54, 44, 20,
  10, 7, 6, 11, 21, 33, 27, 13, 8, 6, 9, 16, 29, 46, 56, 38, 16, 9, 7, 8, 14, 25, 40, 52, 34, 14,
  8, 6, 10, 18, 31, 45, 38, 18, 9, 7, 8, 13, 22, 8,
];

/**
 * Take B - selected winner (purple). Same shape used on the right “pick” column.
 * Smoother, more sustained peaks.
 */
export const WAVE_TAKE_B: number[] = [
  8, 10, 12, 9, 14, 18, 22, 16, 11, 8, 6, 9, 28, 46, 58, 52, 36, 20, 12, 8, 7, 10, 15, 24, 40, 62,
  70, 54, 30, 14, 9, 7, 8, 12, 19, 34, 48, 44, 26, 13, 8, 6, 5, 8, 14, 21, 18, 12, 9, 11, 32, 55,
  66, 50, 28, 15, 10, 8, 7, 9, 16, 27, 42, 38, 22, 12, 8, 6, 10, 17, 25, 20, 13, 9, 7, 11, 36, 60,
  68, 48, 24, 12, 8, 6, 7, 13, 23, 31, 26, 15, 10, 8, 9, 14, 29, 50, 64, 56, 33, 16, 10, 7, 6, 8,
  12, 18, 15, 10, 8, 11, 20, 35, 45, 40, 22, 12, 8, 6, 9, 15, 8, 10, 14, 22, 38, 52, 44, 24, 12, 8,
];

/** Take C - sparser, quieter with occasional spikes (gray / not selected) */
export const WAVE_TAKE_C: number[] = [
  5, 6, 7, 6, 8, 10, 9, 7, 6, 5, 12, 28, 44, 36, 14, 7, 5, 6, 8, 11, 10, 7, 5, 6, 18, 40, 52, 30,
  12, 6, 5, 7, 9, 8, 6, 5, 7, 14, 32, 48, 58, 34, 13, 6, 5, 6, 8, 10, 9, 6, 5, 11, 26, 42, 38, 16,
  7, 5, 6, 8, 12, 20, 16, 8, 5, 6, 7, 9, 22, 46, 54, 28, 10, 6, 5, 7, 10, 14, 11, 7, 5, 6, 15, 34,
  50, 40, 15, 7, 5, 6, 8, 9, 7, 5, 6, 10, 24, 38, 32, 12, 6, 5, 7, 11, 18, 14, 8, 5, 6, 9, 16, 30,
  44, 36, 14, 7, 5, 6, 8, 10, 7,
];

/** Index in TAKES that is the purple “chosen” take (middle of the stack). */
export const SELECTED_TAKE_INDEX = 1;

export const TAKES = [
  { id: "a", samples: WAVE_TAKE_A, selected: false },
  { id: "b", samples: WAVE_TAKE_B, selected: true },
  { id: "c", samples: WAVE_TAKE_C, selected: false },
] as const;
