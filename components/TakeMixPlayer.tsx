"use client";

import { WaveformMixPlayer } from "@/components/WaveformMixPlayer";

/**
 * Producer take review: waveform Take/Bed/Both with manual ms nudge.
 * Streams takeSrc (usually MP3 preview); downloads use downloadSrc (master) when allowed.
 */
export function TakeMixPlayer({
  takeSrc,
  bedSrc,
  className = "",
  allowDownload = false,
  downloadSrc = null,
  downloadJob = null,
}: {
  takeSrc: string;
  bedSrc: string;
  className?: string;
  allowDownload?: boolean;
  /** Master file for download (WAV etc). Defaults to takeSrc when omitted. */
  downloadSrc?: string | null;
  downloadJob?: { id: string; title: string; lyrics?: string | null } | null;
}) {
  return (
    <WaveformMixPlayer
      partSrc={takeSrc}
      partDownloadSrc={downloadSrc}
      backingSrc={bedSrc}
      className={className}
      allowDownload={allowDownload}
      downloadJob={downloadJob}
      partTabLabel="Take"
      partCaption="Your submitted take"
      headingLabel="Submission"
      showNudge
      initialMode="both"
    />
  );
}
