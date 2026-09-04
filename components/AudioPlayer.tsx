"use client";

import { useEffect, useRef, useState } from "react";
import {
  beatIntervalSec,
  mixAudioUrlWithClick,
  scheduleClick,
  withClickFilename,
} from "@/lib/metronome";

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
  bpm = null,
  className = "",
}: {
  src: string;
  /** Accessible name / download button label context, e.g. "Demo" or "Take" */
  label?: string;
  /** Optional download filename override */
  filename?: string;
  /** Only show download when the listener is allowed to keep the file */
  allowDownload?: boolean;
  /** Fixed tempo BPM — enables listen/download with metronome. Null = flexible. */
  bpm?: number | null;
  className?: string;
}) {
  const downloadName = filename ?? guessFilename(src, `${label.toLowerCase().replace(/\s+/g, "-")}.mp3`);
  const hasFixedTempo = typeof bpm === "number" && bpm > 0;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const nextBeatRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [withClick, setWithClick] = useState(false);
  const [mixing, setMixing] = useState(false);
  const [mixError, setMixError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFixedTempo) setWithClick(false);
  }, [hasFixedTempo]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      void ctxRef.current?.close().catch(() => undefined);
    };
  }, []);

  function ensureCtx() {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }

  function syncNextBeatFromAudio() {
    const audio = audioRef.current;
    if (!audio || !hasFixedTempo || !bpm) return;
    const interval = beatIntervalSec(bpm);
    const t = audio.currentTime;
    // Next beat on or after current time (beat 0 at t=0)
    nextBeatRef.current = Math.ceil(t / interval - 1e-9) * interval;
    if (nextBeatRef.current < t) nextBeatRef.current += interval;
  }

  function tickClicks() {
    const audio = audioRef.current;
    if (!audio || !withClick || !hasFixedTempo || !bpm || audio.paused) {
      rafRef.current = null;
      return;
    }

    const ctx = ensureCtx();
    const interval = beatIntervalSec(bpm);
    const now = audio.currentTime;

    while (nextBeatRef.current <= now + 0.02) {
      const beatIndex = Math.round(nextBeatRef.current / interval);
      const accent = beatIndex % 4 === 0;
      const when = ctx.currentTime + Math.max(0, nextBeatRef.current - now);
      scheduleClick(ctx, when, { accent });
      nextBeatRef.current += interval;
    }

    rafRef.current = requestAnimationFrame(tickClicks);
  }

  function startClickLoop() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    syncNextBeatFromAudio();
    void ensureCtx().resume();
    rafRef.current = requestAnimationFrame(tickClicks);
  }

  function stopClickLoop() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  async function downloadWithClick() {
    if (!hasFixedTempo || !bpm) return;
    setMixing(true);
    setMixError(null);
    try {
      const blob = await mixAudioUrlWithClick(src, bpm);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = withClickFilename(downloadName);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMixError(err instanceof Error ? err.message : "Couldn’t mix click track");
    } finally {
      setMixing(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <audio
          ref={audioRef}
          controls
          src={src}
          className="audio-player min-w-0 flex-1"
          preload="metadata"
          onPlay={() => {
            if (withClick) startClickLoop();
          }}
          onPause={stopClickLoop}
          onEnded={stopClickLoop}
          onSeeked={() => {
            if (withClick && audioRef.current && !audioRef.current.paused) {
              startClickLoop();
            } else {
              syncNextBeatFromAudio();
            }
          }}
        />
        {allowDownload && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <a
              href={src}
              download={downloadName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-gray-600 transition-all duration-150 ease-out hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              <DownloadIcon />
              {hasFixedTempo ? "Without click" : "Download"}
            </a>
            {hasFixedTempo && (
              <button
                type="button"
                disabled={mixing}
                title="Download a WAV with metronome clicks mixed in"
                onClick={() => void downloadWithClick()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-gray-600 transition-all duration-150 ease-out hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DownloadIcon />
                {mixing ? "Mixing…" : "With click"}
              </button>
            )}
          </div>
        )}
      </div>

      <label
        className={`inline-flex w-fit items-center gap-2 text-xs ${
          hasFixedTempo ? "cursor-pointer text-gray-600 dark:text-gray-300" : "cursor-not-allowed text-gray-400"
        }`}
        title={
          hasFixedTempo
            ? `Play a metronome at ${bpm} BPM, starting on beat 1 when the audio starts`
            : "Auto metronome only works when this job has a fixed tempo"
        }
      >
        <input
          type="checkbox"
          checked={withClick}
          disabled={!hasFixedTempo}
          onChange={(e) => {
            const next = e.target.checked;
            setWithClick(next);
            if (next && audioRef.current && !audioRef.current.paused) {
              startClickLoop();
            } else {
              stopClickLoop();
            }
          }}
          className="h-3.5 w-3.5 rounded border-gray-300 text-accent focus:ring-accent/30 disabled:opacity-40"
        />
        Listen with click
        {hasFixedTempo ? (
          <span className="text-gray-400">({bpm} BPM)</span>
        ) : (
          <span className="text-gray-400">(needs fixed tempo)</span>
        )}
      </label>

      {mixError && <p className="text-xs text-red-600 dark:text-red-400">{mixError}</p>}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 16.5V3"
      />
    </svg>
  );
}
