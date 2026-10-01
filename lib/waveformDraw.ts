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

const QUIET = 0.1;

export type WaveLayer = {
  peaks: Float32Array;
  role: "part" | "bed";
  shiftPx?: number;
};

function barLayout(width: number) {
  const step = BAR_W + BAR_GAP;
  const bars = Math.max(12, Math.floor((width + BAR_GAP) / step));
  const barW = (width + BAR_GAP) / bars - BAR_GAP;
  return { bars, barW };
}

/** Rounded bars. Quiet buckets stay dots so silence doesn't look like audio. */
function drawBars(
  ctx: CanvasRenderingContext2D,
  peaks: Float32Array,
  width: number,
  mid: number,
  color: string,
  shiftPx: number,
  { widthScale = 1, dots = true }: { widthScale?: number; dots?: boolean } = {}
) {
  if (peaks.length === 0 || width <= 0) return;
  const { bars, barW } = barLayout(width);
  const data = bucketPeaks(peaks, bars);
  const drawW = Math.max(1.6, barW * widthScale);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < bars; i++) {
    const slot = i * (barW + BAR_GAP) + shiftPx;
    const x = slot + (barW - drawW) / 2;
    if (x + drawW < -2 || slot > width + 2) continue;
    if (data[i] < QUIET) {
      if (!dots) continue;
      const cx = slot + barW / 2;
      ctx.moveTo(cx + 1.35, mid);
      ctx.arc(cx, mid, 1.35, 0, Math.PI * 2);
      continue;
    }
    const h = Math.max(4, data[i] * (mid - 2) * 1.92);
    roundWaveRect(ctx, x, mid - h / 2, drawW, h, widthScale < 1 ? 1.2 : 1.6);
  }
  ctx.fill();
}

function drawPlayhead(ctx: CanvasRenderingContext2D, x: number, height: number) {
  if (x <= 0.5) return;
  const px = Math.round(x) + 0.5;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(px, 1);
  ctx.lineTo(px, height - 1);
  ctx.stroke();
  ctx.strokeStyle = "#111113";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, 1);
  ctx.lineTo(px, height - 1);
  ctx.stroke();
  ctx.restore();
}

export function ratioFromClientX(el: HTMLElement, clientX: number) {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
}

function cssAccent(el: HTMLElement) {
  const v = getComputedStyle(el).getPropertyValue("--accent").trim();
  return v || WAVE_ACCENT;
}

export function paintWaveform(opts: {
  canvas: HTMLCanvasElement;
  wrap: HTMLDivElement;
  peaks: WaveLayer[];
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
  const bed = peaks.find((layer) => layer.role === "bed");
  const part = peaks.find((layer) => layer.role === "part");
  const overlay = Boolean(bed && part);

  if (overlay && bed && part) {
    drawBars(ctx, bed.peaks, cssW, mid, "#b9b8b3", 0);
    drawBars(ctx, part.peaks, cssW, mid, accent, part.shiftPx ?? 0, { widthScale: 0.48, dots: false });
    if (progressX > 1 && progressX < cssW - 1) {
      ctx.fillStyle = "rgba(255,255,255,0.42)";
      ctx.fillRect(progressX, 0, cssW - progressX, height);
    }
  } else {
    const layer = part ?? bed ?? peaks[0];
    if (layer) {
      drawBars(ctx, layer.peaks, cssW, mid, WAVE_BASE, layer.shiftPx ?? 0);
      if (progressX > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, progressX, height);
        ctx.clip();
        drawBars(ctx, layer.peaks, cssW, mid, accent, layer.shiftPx ?? 0);
        ctx.restore();
      }
    }
  }

  drawPlayhead(ctx, progressX, height);
}
