/** Shared static data for the homepage MIDI → waveform strip (SSR-safe). */

export const STRIP_WIDTH = 800;

export const MIDI_LANES = [16, 30, 44, 58, 72, 86];

type MidiNote = {
  id: string;
  x: number;
  lane: number;
  w: number;
  opacity: number;
};

/** ~14–16 notes across one strip; track is duplicated for a seamless loop. */
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

/**
 * DAW-ish amplitude samples. Peaks / quiet stretches so the scroll reads as audio.
 */
export const WAVE_SAMPLES: number[] = [
  8, 10, 12, 9, 14, 18, 22, 16, 11, 8, 6, 9, 28, 46, 58, 52, 36, 20, 12, 8, 7, 10, 15, 24, 40, 62,
  70, 54, 30, 14, 9, 7, 8, 12, 19, 34, 48, 44, 26, 13, 8, 6, 5, 8, 14, 21, 18, 12, 9, 11, 32, 55,
  66, 50, 28, 15, 10, 8, 7, 9, 16, 27, 42, 38, 22, 12, 8, 6, 10, 17, 25, 20, 13, 9, 7, 11, 36, 60,
  68, 48, 24, 12, 8, 6, 7, 13, 23, 31, 26, 15, 10, 8, 9, 14, 29, 50, 64, 56, 33, 16, 10, 7, 6, 8,
  12, 18, 15, 10, 8, 11, 20, 35, 45, 40, 22, 12, 8, 6, 9, 15, 8, 10, 14, 22, 38, 52, 44, 24, 12, 8,
];
