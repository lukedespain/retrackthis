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
  fileName,
}: {
  partSrc: string;
  backingSrc?: string | null;
  allowDownload?: boolean;
  className?: string;
  partTabLabel?: string;
  /** Sit inside an existing panel instead of drawing another card. */
  flat?: boolean;
  /** Shown in place of the word Reference. */
  fileName?: string;
}) {
  return (
    <WaveformMixPlayer
      partSrc={partSrc}
      backingSrc={backingSrc}
      allowDownload={allowDownload}
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
