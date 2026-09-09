"use client";

import { WaveformMixPlayer } from "@/components/WaveformMixPlayer";

/**
 * Job reference tracks — waveform Part / Bed / Both (no nudge).
 */
export function ReferenceTracksPlayer({
  partSrc,
  backingSrc = null,
  bpm = null,
  allowDownload = false,
  className = "",
  partTabLabel = "Part",
}: {
  partSrc: string;
  backingSrc?: string | null;
  bpm?: number | null;
  allowDownload?: boolean;
  className?: string;
  partTabLabel?: string;
}) {
  return (
    <WaveformMixPlayer
      partSrc={partSrc}
      backingSrc={backingSrc}
      bpm={bpm}
      allowDownload={allowDownload}
      className={className}
      partTabLabel={partTabLabel}
      headingLabel="Reference"
      showNudge={false}
      initialMode="part"
    />
  );
}
