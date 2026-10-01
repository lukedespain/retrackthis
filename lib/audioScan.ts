/** How long a Part file is actually sounding, plus a short peak trace for the upload tile. */

export type AudioScan = {
  fileDurationSeconds: number;
  /** Windows loud enough to count as the part playing, not the silent gaps around it. */
  playSeconds: number;
  peaks: number[];
  active: boolean[];
};

/** Stereo 24-bit WAVs of a few minutes still fit; bigger files skip the scan. */
const SCAN_MAX_BYTES = 120 * 1024 * 1024;

export async function scanAudioFile(file: File): Promise<AudioScan | null> {
  if (file.size > SCAN_MAX_BYTES) return null;
  if (!file.type.startsWith("audio/") && !/\.(wav|mp3|m4a|aac|flac|ogg|aiff|aif)$/i.test(file.name)) {
    return null;
  }

  let ctx: AudioContext | null = null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    ctx = new AudioCtx();
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    await ctx.close();
    ctx = null;

    const ch = buf.getChannelData(0);
    const N = 96;
    const per = Math.max(1, Math.floor(ch.length / N));
    const peaks: number[] = [];
    const rms: number[] = [];
    for (let b = 0; b < N; b++) {
      let mx = 0;
      let sum = 0;
      let c = 0;
      const start = b * per;
      const end = b === N - 1 ? ch.length : Math.min(ch.length, start + per);
      for (let j = start; j < end; j += 32) {
        const v = Math.abs(ch[j]);
        if (v > mx) mx = v;
        sum += v * v;
        c++;
      }
      peaks.push(mx);
      rms.push(Math.sqrt(sum / Math.max(1, c)));
    }

    const win = Math.max(1, Math.floor(buf.sampleRate * 0.1));
    const wins: number[] = [];
    for (let s = 0; s < ch.length; s += win) {
      let sum = 0;
      let c = 0;
      const end = Math.min(s + win, ch.length);
      for (let j = s; j < end; j += 16) {
        sum += ch[j] * ch[j];
        c++;
      }
      wins.push(Math.sqrt(sum / Math.max(1, c)));
    }

    const top = Math.max(...wins, 1e-6);
    const thr = Math.max(0.004, top * 0.06);
    const pk = Math.max(...peaks, 1e-6);
    const playSeconds = Math.round(wins.filter((v) => v > thr).length * 0.1);
    const fileDurationSeconds = Math.max(1, Math.round(buf.duration));
    return {
      fileDurationSeconds,
      playSeconds: Math.max(0, Math.min(fileDurationSeconds, playSeconds)),
      peaks: peaks.map((v) => Math.round((v / pk) * 1000) / 1000),
      active: rms.map((v) => v > thr),
    };
  } catch {
    try {
      await ctx?.close();
    } catch {
      // ignore
    }
    return null;
  }
}
