"use client";

import { WaveformMixPlayer } from "@/components/WaveformMixPlayer";

/**
 * Producer take review: waveform Take/Bed/Both with manual ms nudge.
 */
export function TakeMixPlayer({
  takeSrc,
  bedSrc,
  bpm = null,
  className = "",
}: {
  takeSrc: string;
  bedSrc: string;
  bpm?: number | null;
  className?: string;
}) {
  return (
    <WaveformMixPlayer
      partSrc={takeSrc}
      backingSrc={bedSrc}
      bpm={bpm}
      className={className}
      partTabLabel="Take"
      headingLabel="Submission"
      showNudge
      initialMode="both"
    />
  );
}
