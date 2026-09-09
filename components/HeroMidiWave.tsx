import {
  MIDI_LANES,
  MIDI_NOTES,
  SELECTED_TAKE_INDEX,
  STRIP_WIDTH,
  TAKES,
} from "@/components/heroMidiWaveData";

/**
 * Three-stage hero matching How it works:
 * 1) MIDI demo → 2) three stacked takes → 3) the chosen take.
 * Always flows left-to-right (including mobile).
 */
export function HeroMidiWave() {
  const selected = TAKES[SELECTED_TAKE_INDEX];

  return (
    <div
      className="hero-midi-wave relative mt-12 overflow-hidden border-t border-gray-100 bg-[var(--panel-soft)] sm:mt-20"
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,75,255,0.05),transparent_70%)]" />

      <div className="relative flex h-40 w-full flex-row items-stretch sm:h-52">
        {/* 01 - Post the part (MIDI) */}
        <div className="relative min-h-0 min-w-0 flex-[1.05] overflow-hidden">
          <div className="hero-midi-track">
            <MidiStrip />
            <MidiStrip />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-[var(--fade)] to-transparent sm:w-12" />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-[var(--fade)] to-transparent sm:w-12" />
        </div>

        <StageDivider />

        {/* 02 - Musicians submit takes (3 stacked waveforms) */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1 py-2 sm:gap-2 sm:py-3">
          {TAKES.map((take) => (
            <div
              key={take.id}
              className={`relative min-h-0 flex-1 overflow-hidden rounded-sm ${
                take.selected ? "ring-1 ring-accent/25" : ""
              }`}
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-4 bg-gradient-to-r from-[var(--fade)] to-transparent sm:w-6" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-4 bg-gradient-to-l from-[var(--fade)] to-transparent sm:w-6" />
              <div className="hero-wave-track h-full">
                <WaveStrip
                  samples={take.samples}
                  tone={take.selected ? "accent" : "muted"}
                  compact
                />
                <WaveStrip
                  samples={take.samples}
                  tone={take.selected ? "accent" : "muted"}
                  compact
                />
              </div>
            </div>
          ))}
        </div>

        <StageDivider />

        {/* 03 - Pick your favorite (same shape as selected take) */}
        <div className="relative min-h-0 min-w-0 flex-[1.05] overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 bg-gradient-to-r from-[var(--fade)] to-transparent sm:w-12" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-[var(--fade)] to-transparent sm:w-12" />
          <div className="hero-wave-track h-full items-center">
            <WaveStrip samples={selected.samples} tone="accent" />
            <WaveStrip samples={selected.samples} tone="accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StageDivider() {
  return (
    <div className="relative z-10 flex w-px shrink-0 items-stretch self-stretch py-4 sm:py-5">
      <div className="hero-divider w-px flex-1 bg-gradient-to-b from-transparent via-accent to-transparent" />
      <div className="hero-divider-glow pointer-events-none absolute left-1/2 top-1/2 h-24 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-lg sm:h-32 sm:w-6" />
    </div>
  );
}

function MidiStrip() {
  return (
    <div
      className="hero-midi-strip relative h-40 shrink-0 sm:h-52"
      style={{ width: STRIP_WIDTH }}
    >
      {MIDI_LANES.map((top) => (
        <div
          key={top}
          className="absolute left-0 right-0 h-px bg-gray-100/90 dark:bg-gray-700/80"
          style={{ top: `${top}%` }}
        />
      ))}
      {MIDI_NOTES.map((note) => (
        <span
          key={note.id}
          className="absolute rounded-[2px] bg-accent"
          style={{
            left: note.x,
            top: `${note.lane}%`,
            width: note.w,
            height: 8,
            opacity: note.opacity,
          }}
        />
      ))}
    </div>
  );
}

function WaveStrip({
  samples,
  tone,
  compact = false,
}: {
  samples: readonly number[];
  tone: "accent" | "muted";
  compact?: boolean;
}) {
  const viewH = compact ? 56 : 160;
  const mid = viewH / 2;
  const maxAmp = compact ? mid - 3 : mid - 8;
  const n = samples.length;
  const step = STRIP_WIDTH / n;
  const barW = Math.max(1.1, step * 0.72);
  const colorClass = tone === "accent" ? "text-accent" : "text-gray-300 dark:text-gray-600";
  const fillOpacity = tone === "accent" ? 0.88 : 0.7;

  return (
    <svg
      className={`hero-wave-strip h-full shrink-0 ${colorClass}`}
      style={{ width: STRIP_WIDTH }}
      viewBox={`0 0 ${STRIP_WIDTH} ${viewH}`}
      preserveAspectRatio="none"
    >
      <line
        x1="0"
        y1={mid}
        x2={STRIP_WIDTH}
        y2={mid}
        stroke="currentColor"
        strokeOpacity={tone === "accent" ? 0.1 : 0.16}
        strokeWidth="1"
      />
      {samples.map((amp, i) => {
        // Slight top/bottom asymmetry reads more like real audio, not a perfect mirror.
        const jitter = ((i * 17 + (tone === "accent" ? 3 : 9)) % 11) / 11;
        const top = Math.max(1.2, amp * maxAmp * (0.88 + jitter * 0.22));
        const bot = Math.max(1.2, amp * maxAmp * (0.78 + (1 - jitter) * 0.28));
        return (
          <rect
            key={i}
            x={i * step + (step - barW) / 2}
            y={mid - top}
            width={barW}
            height={top + bot}
            fill="currentColor"
            fillOpacity={fillOpacity}
            rx={0.6}
          />
        );
      })}
    </svg>
  );
}
