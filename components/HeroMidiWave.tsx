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
 * MIDI + selected take + output = purple; other takes = gray.
 */
export function HeroMidiWave() {
  const selected = TAKES[SELECTED_TAKE_INDEX];

  return (
    <div
      className="hero-midi-wave relative mt-14 overflow-hidden border-t border-gray-100 bg-gradient-to-b from-surface via-white to-surface sm:mt-20"
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,75,255,0.05),transparent_70%)]" />

      <div className="relative mx-auto flex h-44 max-w-6xl items-stretch gap-0 sm:h-52">
        {/* 01 — Post the part (MIDI) */}
        <div className="relative min-w-0 flex-[1.05] overflow-hidden">
          <div className="hero-midi-track">
            <MidiStrip />
            <MidiStrip />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-white to-transparent sm:w-12" />
        </div>

        <StageDivider />

        {/* 02 — Musicians submit takes (3 stacked waveforms) */}
        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-2 sm:gap-2 sm:py-3">
          {TAKES.map((take) => (
            <div
              key={take.id}
              className={`relative min-h-0 flex-1 overflow-hidden rounded-sm ${
                take.selected ? "ring-1 ring-accent/25" : ""
              }`}
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-6 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-6 bg-gradient-to-l from-white to-transparent" />
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

        {/* 03 — Pick your favorite (same shape as selected take) */}
        <div className="relative min-w-0 flex-[1.05] overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 bg-gradient-to-r from-white to-transparent sm:w-12" />
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
    <div className="relative z-10 flex w-px shrink-0 items-stretch self-stretch py-3 sm:py-5">
      <div className="hero-divider w-px flex-1 bg-gradient-to-b from-transparent via-accent to-transparent" />
      <div className="hero-divider-glow pointer-events-none absolute left-1/2 top-1/2 h-24 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-lg sm:h-32" />
    </div>
  );
}

function MidiStrip() {
  return (
    <div
      className="hero-midi-strip relative h-44 shrink-0 sm:h-52"
      style={{ width: STRIP_WIDTH }}
    >
      {MIDI_LANES.map((top) => (
        <div
          key={top}
          className="absolute left-0 right-0 h-px bg-gray-100/90"
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
  // Scale amplitudes to fit compact lanes
  const scale = compact ? 0.32 : 1;
  const last = samples.length - 1;
  const colorClass = tone === "accent" ? "text-accent" : "text-gray-300";

  const amps = samples.map((a) => a * scale);

  const upper = amps
    .map((amp, i) => `${(i / last) * STRIP_WIDTH},${mid - amp}`)
    .join(" ");
  const lower = amps
    .map((amp, i) => `${(i / last) * STRIP_WIDTH},${mid + amp}`)
    .join(" ");

  const area = [
    `M 0,${mid}`,
    ...amps.map((amp, i) => `L ${(i / last) * STRIP_WIDTH},${mid - amp}`),
    `L ${STRIP_WIDTH},${mid}`,
    ...[...amps]
      .reverse()
      .map((amp, i) => `L ${((last - i) / last) * STRIP_WIDTH},${mid + amp}`),
    "Z",
  ].join(" ");

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
        strokeOpacity={tone === "accent" ? 0.12 : 0.2}
        strokeWidth="1"
      />
      <path d={area} fill="currentColor" fillOpacity={tone === "accent" ? 0.2 : 0.35} />
      <polyline
        points={upper}
        fill="none"
        stroke="currentColor"
        strokeWidth={compact ? 1.25 : 1.6}
        strokeLinejoin="round"
      />
      <polyline
        points={lower}
        fill="none"
        stroke="currentColor"
        strokeWidth={compact ? 1.25 : 1.6}
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
