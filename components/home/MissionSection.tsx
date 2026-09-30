"use client";

import { useEffect, useRef, useState } from "react";

type Ripple = { x: number; y: number; t0: number; waves: number };

const SCALE = [0, 2, 4, 7, 9];
const NOTES = [...Array.from({ length: 15 }, (_, i) => 48 + 12 * Math.floor(i / 5) + SCALE[i % 5]), 84];
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/**
 * Dark mission block. The glow trails the cursor and a click sends out a sound-wave ripple
 * (skipped with reduced motion). Clicks also play a note: height picks the pitch (pentatonic,
 * 3 octaves), left to right morphs soft sine -> warm -> bright.
 */
export function MissionSection() {
  const secRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const sec = secRef.current;
    const glow = glowRef.current;
    const cv = canvasRef.current;
    if (!sec || !glow || !cv) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const rest = () => ({ x: sec.clientWidth - 120, y: sec.clientHeight - 80 });
    const pos = rest();
    let target: { x: number; y: number } | null = null;
    let ripples: Ripple[] = [];
    let raf = 0;
    let dpr = 1;

    const size = () => {
      dpr = window.devicePixelRatio || 1;
      cv.width = sec.clientWidth * dpr;
      cv.height = sec.clientHeight * dpr;
    };
    const ro = new ResizeObserver(size);
    ro.observe(sec);

    function ring(x: number, y: number, r: number, amp: number, waves: number, phase: number) {
      ctx!.beginPath();
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        const rr = r + amp * Math.sin(a * waves + phase);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i) ctx!.lineTo(px, py);
        else ctx!.moveTo(px, py);
      }
      ctx!.stroke();
    }

    function frame(now: number) {
      const to = target || rest();
      pos.x += (to.x - pos.x) * 0.08;
      pos.y += (to.y - pos.y) * 0.08;
      sec!.style.setProperty("--gx", `${pos.x}px`);
      sec!.style.setProperty("--gy", `${pos.y}px`);

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, cv!.width, cv!.height);
      const rgb =
        getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "95,74,255";
      ripples = ripples.filter((rp) => now - rp.t0 < 2200);
      for (const rp of ripples) {
        for (let i = 0; i < 3; i++) {
          const t = (now - rp.t0 - i * 160) / 1700;
          if (t <= 0 || t >= 1) continue;
          const e = 1 - Math.pow(1 - t, 3);
          ctx!.lineWidth = 1.6 - i * 0.3;
          ctx!.strokeStyle = `rgba(${i ? rgb : "255,255,255"},${Math.pow(1 - t, 1.6) * (i ? 0.5 : 0.35)})`;
          ring(rp.x, rp.y, 14 + e * 340, 7 * (1 - t) * (1 - i * 0.2), rp.waves + i * 2, t * 10 + i);
        }
      }
      const moving = Math.abs(to.x - pos.x) + Math.abs(to.y - pos.y) > 0.5;
      raf = moving || ripples.length ? requestAnimationFrame(frame) : 0;
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const local = (e: PointerEvent) => {
      const r = sec.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        target = local(e);
        kick();
      }
    };
    const onLeave = () => {
      target = null;
      kick();
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      ripples.push({ ...p, t0: performance.now(), waves: 6 + Math.round((p.x / sec.clientWidth) * 12) });
      if (e.pointerType !== "mouse") target = p;
      glow.animate([{ scale: 1 }, { scale: 1.16 }, { scale: 1 }], {
        duration: 1100,
        easing: "cubic-bezier(.2,.8,.2,1)",
      });
      kick();
    };

    sec.addEventListener("pointermove", onMove);
    sec.addEventListener("pointerleave", onLeave);
    sec.addEventListener("pointerdown", onDown);
    return () => {
      sec.removeEventListener("pointermove", onMove);
      sec.removeEventListener("pointerleave", onLeave);
      sec.removeEventListener("pointerdown", onDown);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      sec.style.removeProperty("--gx");
      sec.style.removeProperty("--gy");
    };
  }, []);

  useEffect(() => {
    const sec = secRef.current;
    if (!sec) return;
    let ac: AudioContext | null = null;
    let out: GainNode | null = null;

    function setup() {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ac = new Ctor();
      out = ac.createGain();
      out.gain.value = 0.7;
      const comp = ac.createDynamicsCompressor();
      const delay = ac.createDelay(1);
      const fb = ac.createGain();
      const wet = ac.createGain();
      const tone = ac.createBiquadFilter();
      delay.delayTime.value = 0.27;
      fb.gain.value = 0.28;
      wet.gain.value = 0.22;
      tone.type = "lowpass";
      tone.frequency.value = 2400;
      out.connect(comp);
      out.connect(delay);
      delay.connect(tone);
      tone.connect(fb);
      fb.connect(delay);
      tone.connect(wet);
      wet.connect(comp);
      comp.connect(ac.destination);
    }

    function play(xr: number, yr: number) {
      if (!ac) setup();
      if (!ac || !out) return;
      if (ac.state === "suspended") void ac.resume();
      const t = ac.currentTime;
      const f = hz(NOTES[Math.round((1 - yr) * (NOTES.length - 1))]);
      const env = ac.createGain();
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 0.7 + xr * 5;
      lp.frequency.setValueAtTime(Math.min(16000, f * (2 + xr * 14)), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.2, 200), t + 0.35 + (1 - xr) * 0.8);
      const decay = 1.9 - xr * 0.9;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.32, t + 0.006 + (1 - xr) * 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      const layers: Array<[OscillatorType, number]> = [
        ["sine", Math.max(0, 1 - xr * 2)],
        ["triangle", 1 - Math.abs(xr - 0.5) * 2],
        ["sawtooth", Math.max(0, xr * 2 - 1) * 0.55],
      ];
      for (const [type, amt] of layers) {
        if (amt <= 0.01) continue;
        for (const detune of type === "sawtooth" ? [-7, 7] : [0]) {
          const o = ac.createOscillator();
          const g = ac.createGain();
          o.type = type;
          o.frequency.value = f;
          o.detune.value = detune;
          g.gain.value = amt;
          o.connect(g);
          g.connect(lp);
          o.start(t);
          o.stop(t + decay + 0.05);
        }
      }
      const sub = ac.createOscillator();
      const sg = ac.createGain();
      sub.frequency.value = f / 2;
      sg.gain.value = 0.18 * (1 - yr);
      sub.connect(sg);
      sg.connect(lp);
      sub.start(t);
      sub.stop(t + decay + 0.05);
      lp.connect(env);
      env.connect(out);
    }

    const onDown = (e: PointerEvent) => {
      const r = sec.getBoundingClientRect();
      play(
        Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      );
      setPlayed(true);
    };
    sec.addEventListener("pointerdown", onDown);
    return () => {
      sec.removeEventListener("pointerdown", onDown);
      if (ac) void ac.close();
    };
  }, []);

  return (
    <section ref={secRef} className={`mission${played ? " played" : ""}`}>
      <div ref={glowRef} className="glow" />
      <canvas ref={canvasRef} className="ripples" />
      <span className="mission-hint" aria-hidden="true">
        <span className="hint-click">Click</span>
        <span className="hint-tap">Tap</span> anywhere to play
      </span>
      <h2>
        Music is losing its humanism. <em>We&apos;re building a place to keep it.</em>
      </h2>
      <p>
        We believe technology is a tool, not a crutch, and that the best music still comes from
        people. Our mission is to make human artistry more valuable in a fast-moving world by
        connecting producers with the musicians who bring their songs to life, and paying them
        fairly for it.
      </p>
    </section>
  );
}
