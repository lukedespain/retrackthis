"use client";

import { WaveformMixPlayer } from "@/components/WaveformMixPlayer";

/**
 * Job reference tracks - waveform Part / Bed / Both (no nudge).
 */
export function ReferenceTracksPlayer({
  partSrc,
  backingSrc = null,
  allowDownload = false,
  className = "",
  partTabLabel = "Part",
  flat = false,
}: {
  partSrc: string;
  backingSrc?: string | null;
  allowDownload?: boolean;
  className?: string;
  partTabLabel?: string;
  /** Sit inside an existing panel instead of drawing another card. */
  flat?: boolean;
}) {
  return (
    <WaveformMixPlayer
      partSrc={partSrc}
      backingSrc={backingSrc}
      allowDownload={allowDownload}
      className={`${flat ? "flat" : ""} ${className}`.trim()}
      partTabLabel={partTabLabel}
      headingLabel="Reference"
      showNudge={false}
      initialMode="part"
    />
  );
}
