"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { labelForMusicalKey } from "@/lib/musicalKeys";

const ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

type Sfx = {
  ac: AudioContext;
  out: GainNode;
  delay: DelayNode;
};

type Ripple = { x: number; y: number; t0: number; waves: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function midiFor(keyId: string, high: boolean, yr: number) {
  const [rootId, quality] = (keyId || "C-major").split("-");
  const root = Math.max(0, ROOTS.indexOf(rootId));
  const triad = quality === "minor" ? [0, 3, 7] : [0, 4, 7];
  const degree = clamp(Math.floor((1 - yr) * 3), 0, 2);
  return (high ? 72 : 60) + root + triad[degree];
}

function setup(): Sfx {
  const ac = new AudioContext();
  const out = ac.createGain();
  const comp = ac.createDynamicsCompressor();
  const delay = ac.createDelay(3);
  const fb = ac.createGain();
  const wet = ac.createGain();
  const tone = ac.createBiquadFilter();
  out.gain.value = 0.6;
  fb.gain.value = 0.45;
  wet.gain.value = 0.42;
  tone.type = "lowpass";
  tone.frequency.value = 2200;
  out.connect(comp);
  out.connect(delay);
  delay.connect(tone);
  tone.connect(fb);
  fb.connect(delay);
  tone.connect(wet);
  wet.connect(comp);
  comp.connect(ac.destination);
  return { ac, out, delay };
}

function play(sfx: Sfx, xr: number, midi: number, bpm: number, free: boolean) {
  const { ac, out, delay } = sfx;
  if (ac.state === "suspended") void ac.resume();
  const t = ac.currentTime;
  const f = 440 * 2 ** ((midi - 69) / 12);
  delay.delayTime.setTargetAtTime(!free && bpm > 0 ? clamp(60 / bpm, 0.2, 3) : 0.5, t, 0.01);
  const env = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 0.7 + xr * 5;
  lp.frequency.setValueAtTime(Math.min(16000, f * (2 + xr * 14)), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.2, 200), t + 0.35 + (1 - xr) * 0.8);
  const decay = 1.9 - xr * 0.9;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.3, t + 0.006 + (1 - xr) * 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  const layers: Array<[OscillatorType, number, number[]]> = [
    ["sine", Math.max(0, 1 - xr * 2), [0]],
    ["triangle", 1 - Math.abs(xr - 0.5) * 2, [0]],
    ["sawtooth", Math.max(0, xr * 2 - 1) * 0.55, [-7, 7]],
  ];
  for (const [type, amt, detunes] of layers) {
    if (amt <= 0.01) continue;
    for (const detune of detunes) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = f;
      osc.detune.value = detune;
      gain.gain.value = amt;
      osc.connect(gain);
      gain.connect(lp);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
  }
  lp.connect(env);
  env.connect(out);
}

function ring(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  amp: number,
  waves: number,
  phase: number
) {
  ctx.beginPath();
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const rr = r + amp * Math.sin(a * waves + phase);
    ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.stroke();
}

/** Empty space on the Song step: dots follow the cursor, a click plays in the song's key. */
export function SongPad({
  hidden,
  musicalKey,
  fixedTempo,
  children,
}: {
  hidden?: boolean;
  musicalKey: string;
  fixedTempo: boolean;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const ripples = useRef<Ripple[]>([]);
  const raf = useRef(0);
  const [open, setOpen] = useState(false);
  const [played, setPlayed] = useState(false);
  const label = labelForMusicalKey(musicalKey);

  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      void sfxRef.current?.ac.close();
    };
  }, []);

  function frame(now: number) {
    const cv = canvasRef.current;
    if (!cv) {
      ripples.current = [];
      raf.current = 0;
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const rgb =
      getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() ||
      "123,97,255";
    ripples.current = ripples.current.filter((rp) => now - rp.t0 < 2000);
    for (const rp of ripples.current) {
      for (let i = 0; i < 3; i++) {
        const t = (now - rp.t0 - i * 150) / 1500;
        if (t <= 0 || t >= 1) continue;
        ctx.lineWidth = 1.4 - i * 0.3;
        ctx.strokeStyle = `rgba(${i ? rgb : "17,17,19"},${Math.pow(1 - t, 1.6) * (i ? 0.45 : 0.18)})`;
        ring(ctx, rp.x, rp.y, 10 + (1 - Math.pow(1 - t, 3)) * 240, 6 * (1 - t) * (1 - i * 0.2), rp.waves + i * 2, t * 10 + i);
      }
    }
    raf.current = ripples.current.length ? requestAnimationFrame(frame) : 0;
  }

  function playable(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    return Boolean(el?.closest?.(".song") && !el.closest(".fld, .grid2, [role='alert']"));
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const song = rootRef.current;
    if (!song) return;
    const r = song.getBoundingClientRect();
    song.style.setProperty("--mx", `${e.clientX - r.left}px`);
    song.style.setProperty("--my", `${e.clientY - r.top}px`);
    setOpen(playable(e.target));
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (!playable(e.target)) return;
    const song = rootRef.current;
    if (!song) return;
    const r = song.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const xr = clamp(x / r.width, 0, 1);
    const title = song.querySelector(".fld")?.getBoundingClientRect();
    const grid = song.querySelector(".grid2")?.getBoundingClientRect();
    const top = title ? title.top - r.top : r.height * 0.4;
    const bottom = grid ? grid.bottom - r.top : r.height * 0.7;
    const high = y < (top + bottom) / 2;
    const yr = high ? clamp(top > 0 ? y / top : 0, 0, 1) : clamp((y - bottom) / Math.max(1, r.height - bottom), 0, 1);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ripples.current.push({ x, y, t0: performance.now(), waves: 6 + Math.round(xr * 12) });
      if (!raf.current) raf.current = requestAnimationFrame(frame);
    }
    setPlayed(true);
    const bpm = Number((song.querySelector("#f-bpm") as HTMLInputElement | null)?.value);
    if (!sfxRef.current) sfxRef.current = setup();
    play(sfxRef.current, xr, midiFor(musicalKey, high, yr), bpm, !fixedTempo);
  }

  return (
    <div
      ref={rootRef}
      className={`song${open ? " open" : ""}${played ? " played" : ""}`}
      hidden={hidden}
      onPointerMove={onMove}
      onPointerLeave={() => setOpen(false)}
      onPointerDown={onDown}
    >
      <canvas ref={canvasRef} className="song-fx" aria-hidden="true" />
      <span className="song-hint" aria-hidden="true">
        <span className="sh-click">Click</span>
        <span className="sh-tap">Tap</span> anywhere to play
        {label ? <b> in {label}</b> : null}
      </span>
      {children}
    </div>
  );
}
