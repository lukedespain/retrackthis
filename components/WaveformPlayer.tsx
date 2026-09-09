"use client";

import { useEffect, useRef, useState } from "react";
import {
  beatIntervalSec,
  mixAudioUrlWithClick,
  scheduleClick,
  withClickFilename,
} from "@/lib/metronome";
import { formatWaveTime, paintWaveform } from "@/lib/waveformDraw";
import { loadAudioForMixCached } from "@/lib/waveformPeaks";

const START_AHEAD_SEC = 0.04;

function guessFilename(src: string, fallback: string) {
  try {
    const segment = new URL(src).pathname.split("/").pop();
    if (segment && segment.includes(".")) return decodeURIComponent(segment);
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Single-track Web Audio waveform player (site-wide replacement for the old line scrubber).
 */
export function WaveformPlayer({
  src,
  label = "Audio",
  filename,
  allowDownload = false,
  bpm = null,
  className = "",
  compact = false,
}: {
  src: string;
  label?: string;
  filename?: string;
  allowDownload?: boolean;
  bpm?: number | null;
  className?: string;
  /** Tighter chrome when nested in a take row. */
  compact?: boolean;
}) {
  const downloadName = filename ?? guessFilename(src, `${label.toLowerCase().replace(/\s+/g, "-")}.mp3`);
  const hasFixedTempo = typeof bpm === "number" && bpm > 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const srcNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(false);
  const withClickRef = useRef(false);
  const segCtxStartRef = useRef(0);
  const segTimelineStartRef = useRef(0);
  const rafUiRef = useRef<number | null>(null);
  const rafClickRef = useRef<number | null>(null);
  const nextBeatRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [withClick, setWithClick] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mixing, setMixing] = useState(false);
  const [mixError, setMixError] = useState<string | null>(null);

  withClickRef.current = withClick;
  playingRef.current = playing;
  durationRef.current = duration;

  function publishTime(t: number) {
    const clamped = Math.max(0, Math.min(t, durationRef.current || t));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
  }

  function ensureCtx() {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gainRef.current = gain;
      ctxRef.current = ctx;
    }
    return ctxRef.current;
  }

  function timelineNow() {
    if (!playingRef.current || !ctxRef.current) return currentTimeRef.current;
    return Math.max(0, segTimelineStartRef.current + (ctxRef.current.currentTime - segCtxStartRef.current));
  }

  function stopSource() {
    const node = srcNodeRef.current;
    if (!node) return;
    try {
      node.onended = null;
      node.stop();
    } catch {
      /* ignore */
    }
    try {
      node.disconnect();
    } catch {
      /* ignore */
    }
    srcNodeRef.current = null;
  }

  function stopUiLoop() {
    if (rafUiRef.current != null) {
      cancelAnimationFrame(rafUiRef.current);
      rafUiRef.current = null;
    }
  }

  function stopClickLoop() {
    if (rafClickRef.current != null) {
      cancelAnimationFrame(rafClickRef.current);
      rafClickRef.current = null;
    }
  }

  function pauseTransport(atTime?: number) {
    const t = atTime ?? timelineNow();
    stopSource();
    stopUiLoop();
    stopClickLoop();
    playingRef.current = false;
    setPlaying(false);
    publishTime(t);
  }

  function startUiLoop() {
    stopUiLoop();
    const tick = () => {
      if (!playingRef.current) {
        rafUiRef.current = null;
        return;
      }
      const t = timelineNow();
      const dur = durationRef.current;
      if (dur > 0 && t >= dur - 0.02) {
        pauseTransport(dur);
        return;
      }
      publishTime(t);
      rafUiRef.current = requestAnimationFrame(tick);
    };
    rafUiRef.current = requestAnimationFrame(tick);
  }

  function syncNextBeat(timelineSec: number) {
    if (!hasFixedTempo || !bpm) return;
    const interval = beatIntervalSec(bpm);
    nextBeatRef.current = Math.ceil(timelineSec / interval - 1e-9) * interval;
    if (nextBeatRef.current < timelineSec) nextBeatRef.current += interval;
  }

  function tickClicks() {
    if (!withClickRef.current || !hasFixedTempo || !bpm || !playingRef.current || !ctxRef.current) {
      rafClickRef.current = null;
      return;
    }
    const ctx = ctxRef.current;
    const interval = beatIntervalSec(bpm);
    const now = timelineNow();
    while (nextBeatRef.current <= now + 0.02) {
      const beatIndex = Math.round(nextBeatRef.current / interval);
      const when = segCtxStartRef.current + (nextBeatRef.current - segTimelineStartRef.current);
      scheduleClick(ctx, Math.max(ctx.currentTime, when), { accent: beatIndex % 4 === 0 });
      nextBeatRef.current += interval;
    }
    rafClickRef.current = requestAnimationFrame(tickClicks);
  }

  function startClickLoop() {
    if (!withClickRef.current || !hasFixedTempo) return;
    if (rafClickRef.current != null) cancelAnimationFrame(rafClickRef.current);
    syncNextBeat(timelineNow());
    rafClickRef.current = requestAnimationFrame(tickClicks);
  }

  async function startTransport(t: number) {
    const buffer = bufRef.current;
    if (!buffer) return;
    const ctx = ensureCtx();
    await ctx.resume();
    stopSource();
    stopClickLoop();

    const timeline = Math.max(0, Math.min(t, buffer.duration));
    if (timeline >= buffer.duration) {
      publishTime(buffer.duration);
      return;
    }

    const when = ctx.currentTime + START_AHEAD_SEC;
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(gainRef.current!);
    node.start(when, timeline);
    node.onended = () => {
      if (srcNodeRef.current === node && playingRef.current) pauseTransport(buffer.duration);
    };
    srcNodeRef.current = node;

    segCtxStartRef.current = when;
    segTimelineStartRef.current = timeline;
    playingRef.current = true;
    setPlaying(true);
    publishTime(timeline);
    startUiLoop();
    if (withClickRef.current) startClickLoop();
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReady(false);
    setError(null);
    loadAudioForMixCached(src)
      .then((audio) => {
        if (cancelled) return;
        bufRef.current = audio.buffer;
        setPeaks(audio.peaks);
        setDuration(audio.duration);
        durationRef.current = audio.duration;
        setLoading(false);
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn’t load audio");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!hasFixedTempo) {
      withClickRef.current = false;
      setWithClick(false);
      stopClickLoop();
    }
  }, [hasFixedTempo]);

  useEffect(() => {
    return () => {
      pauseTransport(currentTimeRef.current);
      void ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function seekToRatio(ratio: number) {
    const dur = durationRef.current || 0;
    const t = Math.max(0, Math.min(1, ratio)) * dur;
    if (playingRef.current) void startTransport(t);
    else publishTime(t);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !peaks) return;
    paintWaveform({
      canvas,
      wrap,
      peaks: [{ peaks, color: "rgba(91, 75, 255, 0.9)" }],
      currentTime,
      duration,
      height: compact ? 64 : 80,
    });
  }, [peaks, currentTime, duration, loading, compact]);

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap || !peaks) return;
      paintWaveform({
        canvas,
        wrap,
        peaks: [{ peaks, color: "rgba(91, 75, 255, 0.9)" }],
        currentTime: currentTimeRef.current,
        duration: durationRef.current,
        height: compact ? 64 : 80,
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [peaks, compact]);

  return (
    <div className={`${compact ? "" : "rounded-2xl border border-gray-200 bg-white p-4"} ${className}`}>
      {!compact && (
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      )}

      <div className={`flex items-center gap-3 ${compact ? "" : "mt-3"}`}>
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          disabled={!ready}
          onClick={() => {
            if (playing) pauseTransport();
            else void startTransport(currentTimeRef.current);
          }}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-transform duration-150 hover:bg-accent-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
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
          <div
            ref={wrapRef}
            className="relative cursor-pointer select-none"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seekToRatio((e.clientX - rect.left) / rect.width);
            }}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") seekToRatio((currentTime + 1) / (duration || 1));
              if (e.key === "ArrowLeft") seekToRatio((currentTime - 1) / (duration || 1));
            }}
          >
            <canvas ref={canvasRef} className="block w-full" />
            {loading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100/80 text-xs text-gray-500">
                Loading waveform…
              </div>
            )}
          </div>
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-gray-400">
            <span>{formatWaveTime(currentTime)}</span>
            <span>{formatWaveTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className={`${compact ? "mt-2" : "mt-3"} flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between`}>
        <label
          className={`inline-flex w-fit items-center gap-2 text-xs ${
            hasFixedTempo ? "cursor-pointer text-gray-600" : "cursor-not-allowed text-gray-400"
          }`}
        >
          <input
            type="checkbox"
            checked={withClick}
            disabled={!hasFixedTempo}
            onChange={(e) => {
              const next = e.target.checked;
              withClickRef.current = next;
              setWithClick(next);
              if (next && playingRef.current) startClickLoop();
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

        {allowDownload && (
          <div className="flex flex-wrap gap-1.5">
            <a
              href={src}
              download={downloadName}
              target="_blank"
              rel="noopener noreferrer"
              className={downloadBtnClass}
            >
              <DownloadIcon />
              {hasFixedTempo ? "Without click" : "Download"}
            </a>
            {hasFixedTempo && (
              <button
                type="button"
                disabled={mixing}
                onClick={() => void downloadWithClick()}
                className={downloadBtnClass}
              >
                <DownloadIcon />
                {mixing ? "Mixing…" : "With click"}
              </button>
            )}
          </div>
        )}
      </div>

      {(error || mixError) && (
        <p className="mt-2 text-xs text-red-600">{error || mixError}</p>
      )}
    </div>
  );
}

const downloadBtnClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-gray-600 transition-all duration-150 ease-out hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

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
