import {
  MIDI_LANES,
  MIDI_NOTES,
  STRIP_WIDTH,
  WAVE_SAMPLES,
} from "@/components/heroMidiWaveData";

/**
 * Hero motion: piano-roll MIDI scrolls left → thin center line → DAW-style waveform scrolls out.
 * Both sides are duplicated strips in a seamless loop so the band always feels full.
 */
export function HeroMidiWave() {
  return (
    <div
      className="hero-midi-wave relative mt-14 overflow-hidden border-t border-gray-100 bg-gradient-to-b from-surface via-white to-surface sm:mt-20"
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,75,255,0.05),transparent_70%)]" />

      <div className="relative mx-auto flex h-40 max-w-6xl items-stretch sm:h-48">
        {/* MIDI piano roll → line */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="hero-midi-track">
            <MidiStrip />
            <MidiStrip />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-white to-transparent sm:w-14" />
        </div>

        {/* Thin vertical transform line (no logo) */}
        <div className="relative z-10 flex w-px shrink-0 items-stretch self-stretch py-4 sm:py-6">
          <div className="hero-divider w-px flex-1 bg-gradient-to-b from-transparent via-accent to-transparent" />
          <div className="hero-divider-glow pointer-events-none absolute left-1/2 top-1/2 h-28 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-xl sm:h-36" />
        </div>

        {/* DAW waveform ← out from the line */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-white to-transparent sm:w-14" />
          <div className="hero-wave-track">
            <WaveStrip />
            <WaveStrip />
          </div>
        </div>
      </div>
    </div>
  );
}

function MidiStrip() {
  return (
    <div
      className="hero-midi-strip relative h-40 shrink-0 sm:h-48"
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

function WaveStrip() {
  const mid = 80;
  const last = WAVE_SAMPLES.length - 1;

  const upper = WAVE_SAMPLES.map((amp, i) => {
    const x = (i / last) * STRIP_WIDTH;
    return `${x},${mid - amp}`;
  }).join(" ");

  const lower = WAVE_SAMPLES.map((amp, i) => {
    const x = (i / last) * STRIP_WIDTH;
    return `${x},${mid + amp}`;
  }).join(" ");

  const area = [
    `M 0,${mid}`,
    ...WAVE_SAMPLES.map((amp, i) => {
      const x = (i / last) * STRIP_WIDTH;
      return `L ${x},${mid - amp}`;
    }),
    `L ${STRIP_WIDTH},${mid}`,
    ...[...WAVE_SAMPLES].reverse().map((amp, i) => {
      const x = ((last - i) / last) * STRIP_WIDTH;
      return `L ${x},${mid + amp}`;
    }),
    "Z",
  ].join(" ");

  return (
    <svg
      className="hero-wave-strip h-40 shrink-0 text-accent sm:h-48"
      style={{ width: STRIP_WIDTH }}
      viewBox={`0 0 ${STRIP_WIDTH} 160`}
      preserveAspectRatio="none"
    >
      <line
        x1="0"
        y1={mid}
        x2={STRIP_WIDTH}
        y2={mid}
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="1"
      />
      <path d={area} fill="currentColor" fillOpacity="0.2" />
      <polyline
        points={upper}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <polyline
        points={lower}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}
