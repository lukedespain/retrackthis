/** Shared canvas helpers for waveform players. */

export const WAVE_BASE = "#d9d8d3";
export const WAVE_ACCENT = "#7b61ff";

const BAR_W = 4;
const BAR_GAP = 1.6;

export function formatWaveTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function roundWaveRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Resample peaks to `bars` buckets (max per bucket), normalised to the loudest bar. */
function bucketPeaks(peaks: Float32Array, bars: number) {
  const out = new Float32Array(bars);
  const n = peaks.length;
  if (n === 0) return out;
  let top = 0;
  for (let b = 0; b < bars; b++) {
    const from = Math.floor((b / bars) * n);
    const to = Math.max(from + 1, Math.floor(((b + 1) / bars) * n));
    let mx = 0;
    for (let i = from; i < to && i < n; i++) if (peaks[i] > mx) mx = peaks[i];
    out[b] = mx;
    if (mx > top) top = mx;
  }
  if (top > 0) for (let b = 0; b < bars; b++) out[b] /= top;
  return out;
}

/** Rounded bars, one per bucket, vertically centred. */
export function drawWavePeaks(
  ctx: CanvasRenderingContext2D,
  peaks: Float32Array,
  width: number,
  mid: number,
  { color, shiftPx }: { color: string; shiftPx: number }
) {
  if (peaks.length === 0 || width <= 0) return;
  const step = BAR_W + BAR_GAP;
  const bars = Math.max(8, Math.floor((width + BAR_GAP) / step));
  const barW = (width + BAR_GAP) / bars - BAR_GAP;
  const data = bucketPeaks(peaks, bars);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < bars; i++) {
    const x = i * (barW + BAR_GAP) + shiftPx;
    if (x + barW < 0 || x > width) continue;
    // Quiet stretches stay dots, so the wave only rises where the part is actually playing.
    if (data[i] < 0.12) {
      const cx = x + barW / 2;
      ctx.moveTo(cx + 1.25, mid);
      ctx.arc(cx, mid, 1.25, 0, Math.PI * 2);
      continue;
    }
    const h = Math.max(4, data[i] * mid * 1.85);
    roundWaveRect(ctx, x, mid - h / 2, barW, h, 2);
  }
  ctx.fill();
}

function cssAccent(el: HTMLElement) {
  const v = getComputedStyle(el).getPropertyValue("--accent").trim();
  return v || WAVE_ACCENT;
}

export function paintWaveform(opts: {
  canvas: HTMLCanvasElement;
  wrap: HTMLDivElement;
  /** `color` is the unplayed bar colour; `progressColor` fills bars left of the playhead. */
  peaks: Array<{ peaks: Float32Array; color: string; progressColor?: string; shiftPx?: number }>;
  currentTime: number;
  duration: number;
  height?: number;
}) {
  const { canvas, wrap, peaks, currentTime, duration, height = 48 } = opts;
  const dpr = window.devicePixelRatio || 1;
  const cssW = wrap.clientWidth;
  if (cssW <= 0) return;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, height);

  const mid = height / 2;
  const dur = duration || 1;
  const progressX = Math.max(0, Math.min(cssW, (currentTime / dur) * cssW));
  const accent = cssAccent(wrap);

  for (const layer of peaks) {
    drawWavePeaks(ctx, layer.peaks, cssW, mid, { color: layer.color, shiftPx: layer.shiftPx ?? 0 });
  }

  if (progressX > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressX, height);
    ctx.clip();
    for (const layer of peaks) {
      drawWavePeaks(ctx, layer.peaks, cssW, mid, {
        color: layer.progressColor ?? accent,
        shiftPx: layer.shiftPx ?? 0,
      });
    }
    ctx.restore();
  }
}
