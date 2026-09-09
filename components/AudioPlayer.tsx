"use client";

import { WaveformPlayer } from "@/components/WaveformPlayer";

/** @deprecated Prefer WaveformPlayer — kept as a thin alias for existing imports. */
export function AudioPlayer({
  src,
  label = "Audio",
  filename,
  allowDownload = false,
  bpm = null,
  className = "",
}: {
  src: string;
  label?: string;
  filename?: string;
  allowDownload?: boolean;
  bpm?: number | null;
  className?: string;
}) {
  return (
    <WaveformPlayer
      src={src}
      label={label}
      filename={filename}
      allowDownload={allowDownload}
      bpm={bpm}
      className={className}
    />
  );
}
