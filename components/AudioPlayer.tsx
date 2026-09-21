"use client";

import { WaveformPlayer } from "@/components/WaveformPlayer";

/** @deprecated Prefer WaveformPlayer - kept as a thin alias for existing imports. */
export function AudioPlayer({
  src,
  label = "Audio",
  filename,
  allowDownload = false,
  className = "",
}: {
  src: string;
  label?: string;
  filename?: string;
  allowDownload?: boolean;
  className?: string;
}) {
  return (
    <WaveformPlayer
      src={src}
      label={label}
      filename={filename}
      allowDownload={allowDownload}
      className={className}
    />
  );
}
