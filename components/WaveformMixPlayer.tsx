"use client";

import { useEffect, useRef, useState } from "react";
import { formatWaveTime, paintWaveform } from "@/lib/waveformDraw";
import { loadAudioForMixCached } from "@/lib/waveformPeaks";

type ModeId = "part" | "backing" | "both";

const OFFSET_MIN_MS = -2000;
const OFFSET_MAX_MS = 2000;
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

function formatOffset(ms: number) {
  if (ms === 0) return "0 ms";
  const sign = ms > 0 ? "+" : "−";
  return `${sign}${Math.abs(ms)} ms`;
}

/**
 * Dual-track Web Audio waveform player (Part/Take + Bed + Both).
 * Optional manual nudge - only enable for producer take review.
 */
export function WaveformMixPlayer({
  partSrc,
  partDownloadSrc = null,
  backingSrc = null,
  allowDownload = false,
  className = "",
  partTabLabel = "Part",
  headingLabel = "Reference",
  showNudge = false,
  initialMode = "part",
}: {
  partSrc: string;
  /** Master download URL when streaming a lighter preview. */
  partDownloadSrc?: string | null;
  backingSrc?: string | null;
  allowDownload?: boolean;
  className?: string;
  partTabLabel?: string;
  headingLabel?: string;
  /** Producer take review only - musicians / reference stay locked to the file. */
  showNudge?: boolean;
  initialMode?: ModeId;
}) {
  const partFileForDownload = partDownloadSrc || partSrc;
  const hasAb = Boolean(backingSrc);
  const modes: ModeId[] = hasAb ? ["part", "backing", "both"] : ["part"];
  const startMode: ModeId = hasAb && initialMode === "both" ? "both" : hasAb && initialMode === "backing" ? "backing" : "part";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const modeRef = useRef<ModeId>(startMode);
  const offsetMsRef = useRef(0);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const partBufRef = useRef<AudioBuffer | null>(null);
  const bedBufRef = useRef<AudioBuffer | null>(null);
  const partGainRef = useRef<GainNode | null>(null);
  const bedGainRef = useRef<GainNode | null>(null);
  const partSrcNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bedSrcNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const segCtxStartRef = useRef(0);
  const segTimelineStartRef = useRef(0);

  const rafUiRef = useRef<number | null>(null);

  const [mode, setMode] = useState<ModeId>(startMode);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [offsetMs, setOffsetMs] = useState(0);
  const [partPeaks, setPartPeaks] = useState<Float32Array | null>(null);
  const [bedPeaks, setBedPeaks] = useState<Float32Array | null>(null);
  const [waveError, setWaveError] = useState<string | null>(null);
  const [loadingWave, setLoadingWave] = useState(true);
  const [ready, setReady] = useState(false);

  modeRef.current = mode;
  offsetMsRef.current = showNudge ? offsetMs : 0;
  playingRef.current = playing;
  durationRef.current = duration;

  const modeCopy: Record<ModeId, { title: string; hint: string }> = {
    part: {
      title: partTabLabel === "Take" ? "Take alone" : "Part being retracked",
      hint: partTabLabel === "Take" ? "Just the submission." : "The part musicians are retracking.",
    },
    backing: { title: "Bed alone", hint: "Background / instrumental." },
    both: {
      title: partTabLabel === "Take" ? "Take + bed" : "Part + bed",
      hint: showNudge
        ? "Nudge the take until the transient locks."
        : "Both tracks, locked to one clock.",
    },
  };

  function offsetSec() {
    return showNudge ? offsetMsRef.current / 1000 : 0;
  }

  function publishTime(t: number) {
    const clamped = Math.max(0, Math.min(t, durationRef.current || t));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
  }

  function ensureCtx() {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const partGain = ctx.createGain();
      const bedGain = ctx.createGain();
      partGain.connect(ctx.destination);
      bedGain.connect(ctx.destination);
      partGainRef.current = partGain;
      bedGainRef.current = bedGain;
      ctxRef.current = ctx;
    }
    return ctxRef.current;
  }

  function timelineNow() {
    if (!playingRef.current || !ctxRef.current) return currentTimeRef.current;
    return Math.max(0, segTimelineStartRef.current + (ctxRef.current.currentTime - segCtxStartRef.current));
  }

  function stopSources() {
    for (const node of [partSrcNodeRef.current, bedSrcNodeRef.current]) {
      if (!node) continue;
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
    }
    partSrcNodeRef.current = null;
    bedSrcNodeRef.current = null;
  }

  function stopUiLoop() {
    if (rafUiRef.current != null) {
      cancelAnimationFrame(rafUiRef.current);
      rafUiRef.current = null;
    }
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

  function pauseTransport(atTime?: number) {
    const t = atTime ?? timelineNow();
    stopSources();
    stopUiLoop();
    playingRef.current = false;
    setPlaying(false);
    publishTime(t);
  }

  async function startTransport(t: number) {
    const partBuf = partBufRef.current;
    if (!partBuf) return;
    const bedBuf = bedBufRef.current;
    const ctx = ensureCtx();
    await ctx.resume();

    stopSources();

    const dur = Math.max(partBuf.duration, bedBuf?.duration ?? 0);
    durationRef.current = dur;
    const timeline = Math.max(0, Math.min(t, dur));
    const when = ctx.currentTime + START_AHEAD_SEC;
    const m = modeRef.current;
    const nudge = m === "both" ? offsetSec() : 0;

    const partGain = partGainRef.current!;
    const bedGain = bedGainRef.current!;
    partGain.gain.value = m === "backing" ? 0 : 1;
    bedGain.gain.value = m === "part" ? 0 : 1;

    let startedAny = false;

    if (m === "part" || m === "both") {
      const partFileTime = m === "both" ? timeline - nudge : timeline;
      const src = ctx.createBufferSource();
      src.buffer = partBuf;
      src.connect(partGain);
      if (partFileTime >= 0 && partFileTime < partBuf.duration) {
        src.start(when, partFileTime);
        startedAny = true;
      } else if (partFileTime < 0) {
        src.start(when - partFileTime, 0);
        startedAny = true;
      }
      src.onended = () => {
        if (partSrcNodeRef.current === src && m === "part" && playingRef.current) {
          pauseTransport(dur);
        }
      };
      partSrcNodeRef.current = src;
    }

    if ((m === "backing" || m === "both") && bedBuf && timeline < bedBuf.duration) {
      const src = ctx.createBufferSource();
      src.buffer = bedBuf;
      src.connect(bedGain);
      src.start(when, timeline);
      src.onended = () => {
        if (bedSrcNodeRef.current === src && playingRef.current) {
          pauseTransport(dur);
        }
      };
      bedSrcNodeRef.current = src;
      startedAny = true;
    }

    if (!startedAny) {
      publishTime(timeline);
      return;
    }

    segCtxStartRef.current = when;
    segTimelineStartRef.current = timeline;
    playingRef.current = true;
    setPlaying(true);
    publishTime(timeline);
    startUiLoop();
  }

  useEffect(() => {
    let cancelled = false;
    setLoadingWave(true);
    setReady(false);
    setWaveError(null);

    const loads = [loadAudioForMixCached(partSrc)];
    if (backingSrc) loads.push(loadAudioForMixCached(backingSrc));

    Promise.all(loads)
      .then((results) => {
        if (cancelled) return;
        const part = results[0];
        partBufRef.current = part.buffer;
        setPartPeaks(part.peaks);
        let dur = part.duration;
        if (results[1]) {
          bedBufRef.current = results[1].buffer;
          setBedPeaks(results[1].peaks);
          dur = Math.max(dur, results[1].duration);
        } else {
          bedBufRef.current = null;
          setBedPeaks(null);
        }
        setDuration(dur);
        durationRef.current = dur;
        setLoadingWave(false);
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setWaveError(err instanceof Error ? err.message : "Couldn’t load audio");
        setLoadingWave(false);
        setReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [partSrc, backingSrc]);

  useEffect(() => {
    return () => {
      pauseTransport(currentTimeRef.current);
      void ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function play() {
    if (!ready) return;
    await startTransport(currentTimeRef.current);
  }

  function pause() {
    pauseTransport();
  }

  async function switchMode(next: ModeId) {
    if (next === modeRef.current) return;
    const wasPlaying = playingRef.current;
    let t = timelineNow();

    if (showNudge) {
      if (modeRef.current === "part" && next !== "part") {
        t = Math.max(0, t + offsetSec());
      } else if (modeRef.current !== "part" && next === "part") {
        t = Math.max(0, t - offsetSec());
      }
    }

    pauseTransport(t);
    setMode(next);
    modeRef.current = next;

    if (wasPlaying) await startTransport(t);
    else publishTime(t);
  }

  function seekToRatio(ratio: number) {
    const dur = durationRef.current || 0;
    const t = Math.max(0, Math.min(1, ratio)) * dur;
    if (playingRef.current) void startTransport(t);
    else publishTime(t);
  }

  function applyOffset(nextMs: number) {
    if (!showNudge) return;
    const clamped = Math.max(OFFSET_MIN_MS, Math.min(OFFSET_MAX_MS, Math.round(nextMs)));
    setOffsetMs(clamped);
    offsetMsRef.current = clamped;
    if (modeRef.current !== "both") return;
    const t = timelineNow();
    if (playingRef.current) void startTransport(t);
    else publishTime(t);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const layers: Array<{ peaks: Float32Array; color: string; shiftPx?: number }> = [];
    const showPart = mode === "part" || mode === "both";
    const showBed = mode === "backing" || mode === "both";
    const pxPerSec = wrap.clientWidth / (duration || 1);
    const shift = mode === "both" && showNudge ? (offsetMs / 1000) * pxPerSec : 0;

    if (showBed && bedPeaks) {
      layers.push({
        peaks: bedPeaks,
        color: mode === "both" ? "rgba(107, 114, 128, 0.45)" : "rgba(75, 85, 99, 0.85)",
      });
    }
    if (showPart && partPeaks) {
      layers.push({
        peaks: partPeaks,
        color: mode === "both" ? "rgba(91, 75, 255, 0.85)" : "rgba(91, 75, 255, 0.95)",
        shiftPx: shift,
      });
    }

    paintWaveform({ canvas, wrap, peaks: layers, currentTime, duration });
  }, [partPeaks, bedPeaks, mode, offsetMs, currentTime, duration, loadingWave, showNudge]);

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const layers: Array<{ peaks: Float32Array; color: string; shiftPx?: number }> = [];
      const showPart = modeRef.current === "part" || modeRef.current === "both";
      const showBed = modeRef.current === "backing" || modeRef.current === "both";
      const pxPerSec = wrap.clientWidth / (durationRef.current || 1);
      const shift =
        modeRef.current === "both" && showNudge ? (offsetMsRef.current / 1000) * pxPerSec : 0;
      if (showBed && bedPeaks) {
        layers.push({
          peaks: bedPeaks,
          color: modeRef.current === "both" ? "rgba(107, 114, 128, 0.45)" : "rgba(75, 85, 99, 0.85)",
        });
      }
      if (showPart && partPeaks) {
        layers.push({
          peaks: partPeaks,
          color: modeRef.current === "both" ? "rgba(91, 75, 255, 0.85)" : "rgba(91, 75, 255, 0.95)",
          shiftPx: shift,
        });
      }
      paintWaveform({
        canvas,
        wrap,
        peaks: layers,
        currentTime: currentTimeRef.current,
        duration: durationRef.current,
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [partPeaks, bedPeaks, showNudge]);

  const partName = guessFilename(
    partFileForDownload,
    partTabLabel === "Take" ? "take.wav" : "part.mp3"
  );
  const bedName = backingSrc ? guessFilename(backingSrc, "bed.mp3") : "";

  const tabClass = (selected: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:px-3.5 ${
      selected ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
    }`;

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{headingLabel}</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">{modeCopy[mode].title}</p>
          <p className="mt-0.5 text-xs text-gray-500">{modeCopy[mode].hint}</p>
        </div>
        {hasAb && (
          <div
            className="inline-flex w-full max-w-full rounded-full bg-gray-100 p-0.5 sm:w-auto"
            role="tablist"
            aria-label={headingLabel}
          >
            {modes.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => void switchMode(id)}
                className={`${tabClass(mode === id)} min-h-10 flex-1 sm:min-h-0 sm:flex-none`}
              >
                {id === "part" ? partTabLabel : id === "backing" ? "Bed" : "Both"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          disabled={!ready}
          onClick={() => {
            if (playing) pause();
            else void play();
          }}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-transform duration-150 hover:bg-accent-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#111827]"
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
            {loadingWave && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100/80 text-xs text-gray-500">
                Loading waveform…
              </div>
            )}
          </div>
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-gray-400">
            <span>{formatWaveTime(currentTime)}</span>
            <span>{formatWaveTime(duration)}</span>
          </div>
          {mode === "both" && hasAb && (
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {partTabLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Bed
              </span>
            </div>
          )}
        </div>
      </div>

      {showNudge && mode === "both" && hasAb && (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-gray-700">Nudge take</p>
            <p className="text-xs tabular-nums text-gray-500">{formatOffset(offsetMs)}</p>
          </div>
          <input
            type="range"
            min={OFFSET_MIN_MS}
            max={OFFSET_MAX_MS}
            step={5}
            value={offsetMs}
            onChange={(e) => applyOffset(Number(e.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200"
            style={{ accentColor: "var(--accent)" }}
            aria-label="Nudge take in milliseconds"
          />
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>Earlier</span>
            <button
              type="button"
              className="font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
              onClick={() => applyOffset(0)}
            >
              Reset
            </button>
            <span>Later</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            Drag until the take transient lines up with the bed. Doesn’t change the uploaded file.
          </p>
        </div>
      )}

      {allowDownload && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Downloads</p>
          <div className="mt-3 space-y-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-gray-800">{partTabLabel}</p>
              <a
                href={partFileForDownload}
                download={partName}
                target="_blank"
                rel="noopener noreferrer"
                className={`${downloadBtnClass} w-full justify-center sm:w-auto`}
              >
                Download
              </a>
            </div>
            {backingSrc && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-gray-800">Bed</p>
                <a
                  href={backingSrc}
                  download={bedName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${downloadBtnClass} w-full justify-center sm:w-auto`}
                >
                  Download
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {waveError && <p className="mt-2 text-xs text-amber-700">{waveError}</p>}
    </div>
  );
}

const downloadBtnClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-xs font-medium text-gray-800 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50";
