"use client";

import { WaveformMixPlayer } from "@/components/WaveformMixPlayer";

/**
 * Producer take review: waveform Take/Bed/Both with manual ms nudge.
 * Streams takeSrc (usually MP3 preview); downloads use downloadSrc (master) when allowed.
 */
export function TakeMixPlayer({
  takeSrc,
  bedSrc,
  bpm = null,
  className = "",
  allowDownload = false,
  downloadSrc = null,
}: {
  takeSrc: string;
  bedSrc: string;
  bpm?: number | null;
  className?: string;
  allowDownload?: boolean;
  /** Master file for download (WAV etc). Defaults to takeSrc when omitted. */
  downloadSrc?: string | null;
}) {
  return (
    <WaveformMixPlayer
      partSrc={takeSrc}
      partDownloadSrc={downloadSrc}
      backingSrc={bedSrc}
      bpm={bpm}
      className={className}
      allowDownload={allowDownload}
      partTabLabel="Take"
      headingLabel="Submission"
      showNudge
      initialMode="both"
    />
  );
}
