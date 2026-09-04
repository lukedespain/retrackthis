"use client";

import { useEffect, useRef, useState } from "react";
import {
  beatIntervalSec,
  mixAudioUrlWithClick,
  scheduleClick,
  withClickFilename,
} from "@/lib/metronome";

type ModeId = "part" | "backing" | "both";

function guessFilename(src: string, fallback: string) {
  try {
    const segment = new URL(src).pathname.split("/").pop();
    if (segment && segment.includes(".")) return decodeURIComponent(segment);
  } catch {
    // ignore
  }
  return fallback;
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const MODE_LABELS: Record<ModeId, string> = {
  part: "Part being retracked",
  backing: "Background / instrumental",
  both: "Part + bed together",
};

/**
 * Shared-transport player for job reference tracks.
 * Part / Bed / Both — playhead stays aligned when switching.
 */
export function ReferenceTracksPlayer({
  partSrc,
  backingSrc = null,
  bpm = null,
  allowDownload = false,
  className = "",
}: {
  partSrc: string;
  backingSrc?: string | null;
  bpm?: number | null;
  allowDownload?: boolean;
  className?: string;
}) {
  const hasAb = Boolean(backingSrc);
  const hasFixedTempo = typeof bpm === "number" && bpm > 0;

  const modes: ModeId[] = hasAb ? ["part", "backing", "both"] : ["part"];

  const partRef = useRef<HTMLAudioElement | null>(null);
  const backingRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef<ModeId>("part");
  const ctxRef = useRef<AudioContext | null>(null);
  const nextBeatRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const withClickRef = useRef(false);

  const [mode, setMode] = useState<ModeId>("part");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [withClick, setWithClick] = useState(false);
  const [mixingKey, setMixingKey] = useState<string | null>(null);
  const [mixError, setMixError] = useState<string | null>(null);

  modeRef.current = mode;
  withClickRef.current = withClick;

  function partEl() {
    return partRef.current;
  }
  function bedEl() {
    return backingRef.current;
  }

  /** Clock source for transport + metronome (part when Both). */
  function clockAudio() {
    if (modeRef.current === "backing") return bedEl();
    return partEl();
  }

  useEffect(() => {
    if (!hasFixedTempo) {
      withClickRef.current = false;
      setWithClick(false);
      stopClickLoop();
    }
  }, [hasFixedTempo]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      void ctxRef.current?.close().catch(() => undefined);
    };
  }, []);

  function ensureCtx() {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }

  function syncNextBeatFromAudio(audio: HTMLAudioElement) {
    if (!hasFixedTempo || !bpm) return;
    const interval = beatIntervalSec(bpm);
    const t = audio.currentTime;
    nextBeatRef.current = Math.ceil(t / interval - 1e-9) * interval;
    if (nextBeatRef.current < t) nextBeatRef.current += interval;
  }

  function stopClickLoop() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function tickClicks() {
    const audio = clockAudio();
    if (!audio || !withClickRef.current || !hasFixedTempo || !bpm || audio.paused) {
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
    const audio = clockAudio();
    if (!audio || !withClickRef.current) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    syncNextBeatFromAudio(audio);
    void ensureCtx().resume();
    rafRef.current = requestAnimationFrame(tickClicks);
  }

  function setBothTimes(t: number) {
    for (const el of [partEl(), bedEl()]) {
      if (!el) continue;
      try {
        const max = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : t;
        el.currentTime = Math.min(t, max);
      } catch {
        // ignore seek race
      }
    }
  }

  function syncDurationFromClock() {
    const a = clockAudio();
    const b = modeRef.current === "both" ? bedEl() : null;
    const d = Math.max(
      a && Number.isFinite(a.duration) ? a.duration : 0,
      b && Number.isFinite(b.duration) ? b.duration : 0
    );
    if (d > 0) setDuration(d);
  }

  async function play() {
    const m = modeRef.current;
    try {
      if (m === "both") {
        const part = partEl();
        const bed = bedEl();
        if (!part || !bed) return;
        setBothTimes(currentTime);
        await Promise.all([part.play(), bed.play()]);
      } else if (m === "backing") {
        partEl()?.pause();
        const bed = bedEl();
        if (!bed) return;
        await bed.play();
      } else {
        bedEl()?.pause();
        const part = partEl();
        if (!part) return;
        await part.play();
      }
      setPlaying(true);
      if (withClickRef.current) startClickLoop();
    } catch {
      setPlaying(false);
    }
  }

  function pause() {
    partEl()?.pause();
    bedEl()?.pause();
    stopClickLoop();
    setPlaying(false);
  }

  async function switchMode(next: ModeId) {
    if (next === modeRef.current) return;
    const clock = clockAudio();
    const wasPlaying = Boolean(clock && !clock.paused) || playing;
    const t = clock?.currentTime ?? currentTime;

    partEl()?.pause();
    bedEl()?.pause();
    stopClickLoop();

    setMode(next);
    modeRef.current = next;
    setBothTimes(t);
    setCurrentTime(t);
    syncDurationFromClock();

    if (wasPlaying) {
      await play();
    } else {
      setPlaying(false);
    }
  }

  function seek(next: number) {
    const clamped = Math.max(0, Math.min(next, duration || next));
    setBothTimes(clamped);
    setCurrentTime(clamped);
    const audio = clockAudio();
    if (audio && withClickRef.current && !audio.paused) startClickLoop();
    else if (audio) syncNextBeatFromAudio(audio);
  }

  async function downloadTrackWithClick(src: string, filename: string, key: string) {
    if (!hasFixedTempo || !bpm) return;
    setMixingKey(key);
    setMixError(null);
    try {
      const blob = await mixAudioUrlWithClick(src, bpm);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = withClickFilename(filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMixError(err instanceof Error ? err.message : "Couldn’t mix click track");
    } finally {
      setMixingKey(null);
    }
  }

  const partName = guessFilename(partSrc, "part.mp3");
  const bedName = backingSrc ? guessFilename(backingSrc, "bed.mp3") : "";

  const tabClass = (selected: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:px-3.5 ${
      selected
        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white"
        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
    }`;

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 ${className}`}
    >
      <audio
        ref={partRef}
        src={partSrc}
        preload="metadata"
        className="hidden"
        onTimeUpdate={(e) => {
          if (modeRef.current === "backing") return;
          setCurrentTime(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={() => syncDurationFromClock()}
        onPlay={() => {
          if (modeRef.current === "part" || modeRef.current === "both") {
            setPlaying(true);
            if (withClickRef.current) startClickLoop();
          }
        }}
        onPause={() => {
          if (modeRef.current === "both") {
            if (partEl()?.paused && bedEl()?.paused) {
              setPlaying(false);
              stopClickLoop();
            }
            return;
          }
          if (modeRef.current === "part") {
            setPlaying(false);
            stopClickLoop();
          }
        }}
        onEnded={() => {
          if (modeRef.current === "both") {
            pause();
            return;
          }
          if (modeRef.current === "part") {
            setPlaying(false);
            stopClickLoop();
          }
        }}
      />
      {backingSrc ? (
        <audio
          ref={backingRef}
          src={backingSrc}
          preload="metadata"
          className="hidden"
          onTimeUpdate={(e) => {
            if (modeRef.current !== "backing") return;
            setCurrentTime(e.currentTarget.currentTime);
          }}
          onLoadedMetadata={() => syncDurationFromClock()}
          onPlay={() => {
            if (modeRef.current === "backing" || modeRef.current === "both") {
              setPlaying(true);
              if (withClickRef.current && modeRef.current === "backing") startClickLoop();
            }
          }}
          onPause={() => {
            if (modeRef.current === "both") {
              if (partEl()?.paused && bedEl()?.paused) {
                setPlaying(false);
                stopClickLoop();
              }
              return;
            }
            if (modeRef.current === "backing") {
              setPlaying(false);
              stopClickLoop();
            }
          }}
          onEnded={() => {
            if (modeRef.current === "both") {
              pause();
              return;
            }
            if (modeRef.current === "backing") {
              setPlaying(false);
              stopClickLoop();
            }
          }}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Reference</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
            {MODE_LABELS[mode]}
          </p>
          {hasAb ? (
            <p className="mt-0.5 text-xs text-gray-500">
              Part, bed, or both — playhead stays put when you switch.
            </p>
          ) : null}
        </div>

        {hasAb && (
          <div
            className="inline-flex max-w-full rounded-full bg-gray-100 p-0.5 dark:bg-gray-800"
            role="tablist"
            aria-label="Reference track"
          >
            {modes.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => void switchMode(id)}
                className={tabClass(mode === id)}
              >
                {id === "part" ? "Part" : id === "backing" ? "Bed" : "Both"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => {
            if (playing) pause();
            else void play();
          }}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-transform duration-150 hover:bg-accent-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"
        >
          {playing ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5h3v14H7V5zm7 0h3v14h-3V5z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(currentTime, duration || currentTime)}
            onChange={(e) => seek(Number(e.target.value))}
            onMouseDown={syncDurationFromClock}
            onTouchStart={syncDurationFromClock}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-800"
            style={{ accentColor: "#5B4BFF" }}
            aria-label="Seek"
          />
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <label
          className={`inline-flex w-fit items-center gap-2 text-xs ${
            hasFixedTempo
              ? "cursor-pointer text-gray-600 dark:text-gray-300"
              : "cursor-not-allowed text-gray-400"
          }`}
          title={
            hasFixedTempo
              ? `Play a metronome at ${bpm} BPM, starting on beat 1`
              : "Auto metronome only works when this job has a fixed tempo"
          }
        >
          <input
            type="checkbox"
            checked={withClick}
            disabled={!hasFixedTempo}
            onChange={(e) => {
              const next = e.target.checked;
              withClickRef.current = next;
              setWithClick(next);
              const audio = clockAudio();
              if (next && audio && !audio.paused) startClickLoop();
              else stopClickLoop();
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
      </div>

      {allowDownload && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-3 dark:border-gray-700 dark:bg-gray-900/60">
          <div className="flex items-center gap-2">
            <DownloadIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Downloads
            </p>
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            Save either reference track
            {hasFixedTempo ? " with or without a metronome click" : ""}.
          </p>

          <div className="mt-3 space-y-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Part</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={partSrc}
                  download={partName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={downloadBtnClass}
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  {hasFixedTempo ? "Download · no click" : "Download"}
                </a>
                {hasFixedTempo && (
                  <button
                    type="button"
                    disabled={mixingKey !== null}
                    onClick={() => void downloadTrackWithClick(partSrc, partName, "part")}
                    className={downloadBtnClass}
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    {mixingKey === "part" ? "Mixing…" : "Download · with click"}
                  </button>
                )}
              </div>
            </div>
            {backingSrc && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Bed</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={backingSrc}
                    download={bedName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={downloadBtnClass}
                  >
                    <DownloadIcon className="h-3.5 w-3.5" />
                    {hasFixedTempo ? "Download · no click" : "Download"}
                  </a>
                  {hasFixedTempo && (
                    <button
                      type="button"
                      disabled={mixingKey !== null}
                      onClick={() => void downloadTrackWithClick(backingSrc, bedName, "bed")}
                      className={downloadBtnClass}
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                      {mixingKey === "bed" ? "Mixing…" : "Download · with click"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mixError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{mixError}</p>}
    </div>
  );
}

const downloadBtnClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-xs font-medium text-gray-800 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-900";

function DownloadIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 16.5V3"
      />
    </svg>
  );
}
