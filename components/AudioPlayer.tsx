"use client";

function guessFilename(src: string, fallback: string) {
  try {
    const segment = new URL(src).pathname.split("/").pop();
    if (segment && segment.includes(".")) return decodeURIComponent(segment);
  } catch {
    // ignore invalid URLs
  }
  return fallback;
}

export function AudioPlayer({
  src,
  label = "Audio",
  filename,
  allowDownload = false,
  className = "",
}: {
  src: string;
  /** Accessible name / download button label context, e.g. "Demo" or "Take" */
  label?: string;
  /** Optional download filename override */
  filename?: string;
  /** Only show download when the listener is allowed to keep the file */
  allowDownload?: boolean;
  className?: string;
}) {
  const downloadName = filename ?? guessFilename(src, `${label.toLowerCase().replace(/\s+/g, "-")}.mp3`);

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${className}`}>
      <audio controls src={src} className="audio-player min-w-0 flex-1" preload="metadata" />
      {allowDownload && (
        <a
          href={src}
          download={downloadName}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-gray-600 transition-all duration-150 ease-out hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 active:scale-[0.98] sm:justify-start"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 16.5V3"
            />
          </svg>
          Download
        </a>
      )}
    </div>
  );
}
