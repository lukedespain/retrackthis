/** Shared canvas helpers for waveform players. */

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

export function drawWavePeaks(
  ctx: CanvasRenderingContext2D,
  peaks: Float32Array,
  width: number,
  mid: number,
  { color, shiftPx }: { color: string; shiftPx: number }
) {
  const n = peaks.length;
  if (n === 0 || width <= 0) return;
  ctx.fillStyle = color;
  const barW = Math.max(1, width / n);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * width + shiftPx;
    if (x + barW < 0 || x > width) continue;
    const amp = peaks[i] * (mid - 6);
    const h = Math.max(1.5, amp);
    ctx.fillRect(x, mid - h, Math.max(1, barW * 0.75), h * 2);
  }
}

export function paintWaveform(opts: {
  canvas: HTMLCanvasElement;
  wrap: HTMLDivElement;
  peaks: Array<{ peaks: Float32Array; color: string; shiftPx?: number }>;
  currentTime: number;
  duration: number;
  height?: number;
}) {
  const { canvas, wrap, peaks, currentTime, duration, height = 88 } = opts;
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
  const progressX = (currentTime / dur) * cssW;

  ctx.fillStyle = "#f3f4f6";
  ctx.beginPath();
  roundWaveRect(ctx, 0, 0, cssW, height, 12);
  ctx.fill();

  for (const layer of peaks) {
    drawWavePeaks(ctx, layer.peaks, cssW, mid, {
      color: layer.color,
      shiftPx: layer.shiftPx ?? 0,
    });
  }

  if (progressX > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(0, 0, progressX, height);
  }

  ctx.strokeStyle = "#5B4BFF";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(progressX, 4);
  ctx.lineTo(progressX, height - 4);
  ctx.stroke();
}
