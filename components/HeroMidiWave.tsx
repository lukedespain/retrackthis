import { RetrackMark } from "@/components/Logo";

/** Piano-roll note positions (pitch lane + delay) for the left stream */
const MIDI_NOTES = [
  { lane: 0, delay: 0, width: 28 },
  { lane: 2, delay: 0.35, width: 20 },
  { lane: 1, delay: 0.7, width: 36 },
  { lane: 3, delay: 1.05, width: 24 },
  { lane: 0, delay: 1.4, width: 18 },
  { lane: 2, delay: 1.75, width: 32 },
  { lane: 1, delay: 2.1, width: 22 },
  { lane: 4, delay: 2.45, width: 26 },
  { lane: 3, delay: 2.8, width: 30 },
  { lane: 1, delay: 3.15, width: 16 },
  { lane: 0, delay: 3.5, width: 34 },
  { lane: 2, delay: 3.85, width: 20 },
] as const;

const WAVE_BARS = Array.from({ length: 28 }, (_, i) => ({
  i,
  h: 18 + ((i * 17 + 11) % 42),
  delay: (i % 8) * 0.08,
}));

/**
 * Hero motion: MIDI / scratch notes flow into the Retrack mark and emerge as audio.
 * Full-bleed under the CTAs — brand mark is the transform in the middle.
 */
export function HeroMidiWave() {
  return (
    <div
      className="hero-midi-wave relative mt-14 overflow-hidden border-t border-gray-100 bg-gradient-to-b from-surface via-white to-surface sm:mt-20"
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,75,255,0.07),transparent_65%)]" />

      <div className="relative mx-auto flex h-36 max-w-6xl items-center px-2 sm:h-44 sm:px-4">
        {/* MIDI stream → center */}
        <div className="relative h-full min-w-0 flex-1 overflow-hidden">
          <div className="absolute inset-y-0 right-0 z-[1] w-16 bg-gradient-to-l from-white to-transparent sm:w-24" />
          {MIDI_NOTES.map((note, index) => (
            <span
              key={`midi-${index}`}
              className="hero-midi-note absolute rounded-sm bg-accent/80"
              style={{
                top: `${18 + note.lane * 14}%`,
                width: note.width,
                height: 7,
                animationDelay: `${note.delay}s`,
              }}
            />
          ))}
          {MIDI_NOTES.map((note, index) => (
            <span
              key={`midi-b-${index}`}
              className="hero-midi-note absolute rounded-sm bg-accent/45"
              style={{
                top: `${22 + ((note.lane + 2) % 5) * 14}%`,
                width: note.width * 0.85,
                height: 6,
                animationDelay: `${note.delay + 1.9}s`,
              }}
            />
          ))}
        </div>

        {/* Transform: brand mark */}
        <div className="relative z-10 flex shrink-0 flex-col items-center px-3 sm:px-6">
          <div className="hero-portal absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-2xl sm:h-32 sm:w-32" />
          <div className="hero-mark relative flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_0_0_1px_rgba(91,75,255,0.2),0_12px_40px_-12px_rgba(91,75,255,0.55)] sm:h-14 sm:w-14">
            <RetrackMark className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
        </div>

        {/* Waveform ← emerges from mark */}
        <div className="relative h-full min-w-0 flex-1 overflow-hidden">
          <div className="absolute inset-y-0 left-0 z-[1] w-16 bg-gradient-to-r from-white to-transparent sm:w-24" />
          <div className="absolute inset-0 flex items-center justify-start gap-[3px] pl-2 sm:gap-1 sm:pl-4">
            {WAVE_BARS.map((bar) => (
              <span
                key={`bar-${bar.i}`}
                className="hero-wave-bar w-[3px] shrink-0 rounded-full bg-accent/70 sm:w-1"
                style={{
                  height: bar.h,
                  animationDelay: `${bar.delay}s`,
                }}
              />
            ))}
          </div>
          <div className="hero-wave-drift absolute inset-y-0 left-0 flex items-center gap-[3px] sm:gap-1">
            {WAVE_BARS.map((bar) => (
              <span
                key={`drift-${bar.i}`}
                className="hero-wave-bar w-[3px] shrink-0 rounded-full bg-accent/35 sm:w-1"
                style={{
                  height: 12 + ((bar.h * 3) % 36),
                  animationDelay: `${bar.delay + 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
