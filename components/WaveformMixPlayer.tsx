"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DownloadFiles, type DownloadItem } from "@/components/DownloadFiles";
import { jobFileName } from "@/lib/downloadNames";
import { hasLyrics } from "@/lib/lyrics";
import { formatWaveTime, paintWaveform, ratioFromClientX, type WaveLayer } from "@/lib/waveformDraw";
import { loadAudioForMixCached } from "@/lib/waveformPeaks";

type ModeId = "part" | "backing" | "both";

/** Mix position for each button: 0 is the part alone, 1 is the bed alone. */
const MIX_FOR: Record<ModeId, number> = { part: 0, both: 0.5, backing: 1 };
const START_AHEAD_SEC = 0.04;
const NO_PRELOAD: string[] = [];

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
 * Both tracks sit at full volume in the middle. Moving toward one side
 * turns the other track down, so the ends play one track alone.
 */
function mixGains(mix: number) {
  return { part: Math.min(1, 2 * (1 - mix)), bed: Math.min(1, 2 * mix) };
}

/**
 * Dual-track Web Audio waveform player (Part/Take + Bed) with a mix slider
 * between them. Part, Both, and Bed jump the slider to the left, middle, and right.
 */
export function WaveformMixPlayer({
  partSrc,
  partDownloadSrc = null,
  preloadSrcs = NO_PRELOAD,
  backingSrc = null,
  backingDownloadSrc = null,
  allowDownload = false,
  downloadJob = null,
  className = "",
  partTabLabel = "Part",
  partCaption,
  headingLabel = "Reference",
  heading,
  beforeModes,
  showModeTip = true,
  initialMode = "part",
}: {
  partSrc: string;
  /** Master download URL when streaming a lighter preview. */
  partDownloadSrc?: string | null;
  /** Other part files to decode ahead of time, so a take switch can keep playing. */
  preloadSrcs?: string[];
  backingSrc?: string | null;
  /** Master bed for download when backingSrc is a lighter preview. */
  backingDownloadSrc?: string | null;
  allowDownload?: boolean;
  /** When set, Part, Bed, and lyrics download from one list. */
  downloadJob?: { id: string; title: string; lyrics?: string | null } | null;
  className?: string;
  partTabLabel?: string;
  /** Sentence on the part download tile. */
  partCaption?: string;
  headingLabel?: string;
  /** Replaces the heading label. Sits on the left of Part / Bed / Both. */
  heading?: ReactNode;
  /** Extra controls just left of Part / Bed / Both. */
  beforeModes?: ReactNode;
  showModeTip?: boolean;
  initialMode?: ModeId;
}) {
  const partFileForDownload = partDownloadSrc || partSrc;
  const bedFileForDownload = backingSrc ? backingDownloadSrc || backingSrc : null;
  const hasAb = Boolean(backingSrc);
  const modes: ModeId[] = ["part", "both", "backing"];
  const startMix = hasAb ? MIX_FOR[initialMode] : 0;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const mixRef = useRef(startMix);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(false);
  const resumeRef = useRef(false);

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
  const scrubbingRef = useRef(false);
  const resumeAfterScrubRef = useRef(false);

  const [mix, setMix] = useState(startMix);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [partPeaks, setPartPeaks] = useState<Float32Array | null>(null);
  const [bedPeaks, setBedPeaks] = useState<Float32Array | null>(null);
  const [waveError, setWaveError] = useState<string | null>(null);
  const [loadingWave, setLoadingWave] = useState(true);
  const [ready, setReady] = useState(false);
  const [fileSizes, setFileSizes] = useState<{ part?: string; bed?: string }>({});

  useEffect(() => {
    let cancel = false;
    async function megabytes(url: string) {
      try {
        const res = await fetch(url, { method: "HEAD" });
        const len = Number(res.headers.get("content-length"));
        if (!Number.isFinite(len) || len <= 0) return undefined;
        const mb = len / (1024 * 1024);
        const n = mb >= 10 ? String(Math.round(mb)) : mb < 1 ? mb.toFixed(1) : String(Math.round(mb));
        return `${n} MB`;
      } catch {
        return undefined;
      }
    }
    void (async () => {
      const part = await megabytes(partFileForDownload);
      const bed = bedFileForDownload ? await megabytes(bedFileForDownload) : undefined;
      if (!cancel) setFileSizes({ part, bed });
    })();
    return () => {
      cancel = true;
    };
  }, [partFileForDownload, bedFileForDownload]);

  // Without a bed there is nothing to mix against, so the part plays alone.
  mixRef.current = hasAb ? mix : 0;
  playingRef.current = playing;
  durationRef.current = duration;

  // The button whose position the slider sits on, if any.
  const mode: ModeId | null = !hasAb
    ? "part"
    : (Object.keys(MIX_FOR) as ModeId[]).find((id) => Math.abs(MIX_FOR[id] - mix) < 0.001) ?? null;
  const modeHint: Record<ModeId, string> = {
    part: partTabLabel === "Take" ? "Just the submission." : "The part musicians are retracking.",
    backing: "Background / instrumental.",
    both: `Drag the slider to turn the ${partTabLabel.toLowerCase()} or the bed up and down.`,
  };
  const hint = modeHint[mode ?? "both"];

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
      const gains = mixGains(mixRef.current);
      partGain.gain.value = gains.part;
      bedGain.gain.value = gains.bed;
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
        // Back to the start when it finishes, so the next play starts from the top.
        pauseTransport(0);
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
    const partGain = partGainRef.current!;
    const bedGain = bedGainRef.current!;

    let startedAny = false;

    // Both tracks always run, so moving the slider only changes their volume.
    if (timeline < partBuf.duration) {
      const src = ctx.createBufferSource();
      src.buffer = partBuf;
      src.connect(partGain);
      src.start(when, timeline);
      startedAny = true;
      src.onended = () => {
        // Playing the part alone ends with the part, even when the bed runs longer.
        if (partSrcNodeRef.current === src && mixRef.current === 0 && playingRef.current) {
          pauseTransport(0);
        }
      };
      partSrcNodeRef.current = src;
    }

    if (bedBuf && timeline < bedBuf.duration) {
      const src = ctx.createBufferSource();
      src.buffer = bedBuf;
      src.connect(bedGain);
      src.start(when, timeline);
      src.onended = () => {
        if (bedSrcNodeRef.current === src && mixRef.current === 1 && playingRef.current) {
          pauseTransport(0);
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
    for (const url of preloadSrcs) {
      if (!url || url === partSrc) continue;
      void loadAudioForMixCached(url).catch(() => undefined);
    }
  }, [preloadSrcs, partSrc]);

  useEffect(() => {
    let cancelled = false;
    const wasPlaying = playingRef.current || resumeRef.current;
    const at = timelineNow();
    const swapping = Boolean(partBufRef.current);

    if (wasPlaying) {
      resumeRef.current = true;
      stopSources();
      stopUiLoop();
      playingRef.current = false;
    }
    if (!swapping) {
      setLoadingWave(true);
      setReady(false);
    }
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
        const next = Math.max(0, Math.min(at, dur));
        setDuration(dur);
        durationRef.current = dur;
        setLoadingWave(false);
        setReady(true);
        if (wasPlaying && resumeRef.current) {
          resumeRef.current = false;
          void startTransport(next);
        } else {
          resumeRef.current = false;
          setPlaying(false);
          publishTime(next);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setPlaying(false);
        setWaveError(err instanceof Error ? err.message : "Couldn’t load audio");
        setLoadingWave(false);
        setReady(false);
      });

    return () => {
      cancelled = true;
    };
    // startTransport reads the latest buffers via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const dur = durationRef.current;
    const at = currentTimeRef.current;
    await startTransport(dur > 0 && at >= dur - 0.05 ? 0 : at);
  }

  function pause() {
    resumeRef.current = false;
    pauseTransport();
  }

  function applyMix(next: number) {
    // Snap to the middle so "Both" is easy to land on by dragging.
    const value = Math.abs(next - 0.5) < 0.03 ? 0.5 : Math.max(0, Math.min(1, next));
    mixRef.current = value;
    setMix(value);
    const ctx = ctxRef.current;
    if (!ctx || !partGainRef.current || !bedGainRef.current) return;
    const gains = mixGains(value);
    const now = ctx.currentTime;
    for (const [node, target] of [
      [partGainRef.current, gains.part],
      [bedGainRef.current, gains.bed],
    ] as const) {
      node.gain.cancelScheduledValues(now);
      node.gain.setTargetAtTime(target, now, 0.015);
    }
  }

  function seekToRatio(ratio: number) {
    const dur = durationRef.current || 0;
    const t = Math.max(0, Math.min(1, ratio)) * dur;
    publishTime(t);
  }

  function waveLayers(): WaveLayer[] {
    const layers: WaveLayer[] = [];
    const gains = mixGains(mixRef.current);
    if (bedPeaks) layers.push({ peaks: bedPeaks, role: "bed", scale: gains.bed });
    if (partPeaks) layers.push({ peaks: partPeaks, role: "part", scale: gains.part });
    return layers;
  }

  function paint() {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    paintWaveform({
      canvas,
      wrap,
      peaks: waveLayers(),
      currentTime: currentTimeRef.current,
      duration: durationRef.current,
    });
  }

  function onWavePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!ready) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    resumeAfterScrubRef.current = playingRef.current;
    scrubbingRef.current = true;
    if (playingRef.current) pauseTransport(timelineNow());
    seekToRatio(ratioFromClientX(e.currentTarget, e.clientX));
  }

  function onWavePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) return;
    seekToRatio(ratioFromClientX(e.currentTarget, e.clientX));
  }

  function onWavePointerUp() {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    if (resumeAfterScrubRef.current) void startTransport(currentTimeRef.current);
  }

  useEffect(() => {
    paint();
  }, [partPeaks, bedPeaks, mix, currentTime, duration, loadingWave]);

  const paintRef = useRef(paint);
  paintRef.current = paint;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => paintRef.current());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [partSrc, backingSrc]);

  const partName = downloadJob
    ? jobFileName(downloadJob.title, partTabLabel, partFileForDownload)
    : guessFilename(partFileForDownload, partTabLabel === "Take" ? "take.wav" : "part.mp3");
  const bedName = !bedFileForDownload
    ? ""
    : downloadJob
      ? jobFileName(downloadJob.title, "Bed", bedFileForDownload)
      : guessFilename(bedFileForDownload, "bed.mp3");
  const partDetail = partCaption ?? (partTabLabel === "Take" ? "Your submitted take" : "The part being retracked");

  function downloadItems(): DownloadItem[] {
    if (!downloadJob) return [];
    const items: DownloadItem[] = [
      {
        id: "part",
        name: partTabLabel,
        detail: [partDetail, fileKind(partName), fileSizes.part].filter(Boolean).join(" · "),
        url: partFileForDownload,
        filename: partName,
      },
    ];
    if (bedFileForDownload) {
      items.push({
        id: "bed",
        name: "Bed",
        detail: ["The music you record over", fileKind(bedName), fileSizes.bed].filter(Boolean).join(" · "),
        url: bedFileForDownload,
        filename: bedName,
      });
    }
    if (hasLyrics(downloadJob.lyrics)) {
      items.push({
        id: "lyrics",
        name: "Lyrics",
        detail: "The words, as a PDF",
        lyrics: true,
        filename: "lyrics.pdf",
      });
    }
    return items;
  }

  return (
    <div className={`ref ${className}`}>
      <div className="ref-head">
        {heading ?? (
          <strong className="ref-lbl">
            {mode === "backing" ? "Bed" : mode === "part" ? partTabLabel : "Both"}
            {showModeTip ? (
              <i className="tip sm lead" tabIndex={0} data-tip={hint}>
                i
              </i>
            ) : null}
          </strong>
        )}
        <div className="ref-tools">
          {beforeModes}
          {heading && showModeTip ? (
            <i className="tip sm" tabIndex={0} data-tip={hint}>
              i
            </i>
          ) : null}
          {hasAb ? (
            <div className="mix">
              <div className="seg" role="group" aria-label={headingLabel}>
                {modes.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="mix-mode"
                    aria-pressed={mode === id}
                    onClick={() => applyMix(MIX_FOR[id])}
                  >
                    {id === "part" ? <i className="dot part" aria-hidden /> : null}
                    {id === "backing" ? <i className="dot bed" aria-hidden /> : null}
                    {id === "part" ? partTabLabel : id === "backing" ? "Bed" : "Both"}
                  </button>
                ))}
              </div>
              <input
                type="range"
                className="mix-slider"
                min={0}
                max={1}
                step={0.01}
                value={mix}
                onChange={(e) => applyMix(Number(e.target.value))}
                aria-label={`Mix between ${partTabLabel.toLowerCase()} and bed`}
                aria-valuetext={
                  mode === "part" ? `${partTabLabel} only` : mode === "backing" ? "Bed only" : mode === "both" ? "Both at full volume" : undefined
                }
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="player">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => {
            if (!ready) return;
            if (playing) pause();
            else void play();
          }}
          className="play"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
              <rect x="14" y="5" width="3.5" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 6.2v11.6L18.2 12 9 6.2z" />
            </svg>
          )}
        </button>

        <div className="pw">
          <div
            ref={wrapRef}
            className="pw-wave"
            data-seek=""
            onPointerDown={onWavePointerDown}
            onPointerMove={onWavePointerMove}
            onPointerUp={onWavePointerUp}
            onPointerCancel={onWavePointerUp}
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
          <div className="pw-times">
            <span>{formatWaveTime(currentTime)}</span>
            <span>{formatWaveTime(duration)}</span>
          </div>
        </div>
      </div>

      {allowDownload && downloadJob ? (
        <DownloadFiles title={downloadJob.title} jobId={downloadJob.id} items={downloadItems()} />
      ) : null}

      {waveError && <p className="mt-2 text-xs text-amber-700">{waveError}</p>}
    </div>
  );
}

function fileKind(name: string) {
  const ext = name.split(".").pop()?.toUpperCase();
  if (ext === "MP3" || ext === "WAV") return ext;
  return "Audio";
}
