"use client";

import { WaveformMixPlayer } from "@/components/WaveformMixPlayer";

/**
 * Job reference tracks - waveform Part / Bed / Both (no nudge).
 */
export function ReferenceTracksPlayer({
  partSrc,
  partDownloadSrc = null,
  backingSrc = null,
  backingDownloadSrc = null,
  allowDownload = false,
  className = "",
  partTabLabel = "Part",
  flat = false,
  fileName,
  downloadJob = null,
}: {
  partSrc: string;
  /** Master files for download when partSrc / backingSrc are lighter previews. */
  partDownloadSrc?: string | null;
  backingSrc?: string | null;
  backingDownloadSrc?: string | null;
  allowDownload?: boolean;
  className?: string;
  partTabLabel?: string;
  /** Sit inside an existing panel instead of drawing another card. */
  flat?: boolean;
  /** Shown in place of the word Reference. */
  fileName?: string;
  downloadJob?: { id: string; title: string; lyrics?: string | null } | null;
}) {
  return (
    <WaveformMixPlayer
      partSrc={partSrc}
      partDownloadSrc={partDownloadSrc}
      backingSrc={backingSrc}
      backingDownloadSrc={backingDownloadSrc}
      allowDownload={allowDownload}
      downloadJob={downloadJob}
      className={`${flat ? "flat" : ""} ${className}`.trim()}
      partTabLabel={partTabLabel}
      headingLabel={fileName || "Part"}
      heading={
        fileName ? (
          <strong className="ref-lbl" title={fileName} style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileName}
          </strong>
        ) : undefined
      }
      showNudge={false}
      initialMode="part"
    />
  );
}
