/** Client-side waveform peak extraction for mix players. */

export async function decodeAudioUrl(url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn’t load audio");
  const arrayBuffer = await res.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

function mono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const out = new Float32Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) out[i] = (left[i] + right[i]) * 0.5;
  return out;
}

/** Peak magnitudes 0–1 for drawing a mirrored waveform. */
export function peaksFromBuffer(buffer: AudioBuffer, buckets = 600): Float32Array {
  const samples = mono(buffer);
  const peaks = new Float32Array(buckets);
  const block = Math.max(1, Math.floor(samples.length / buckets));
  let peakMax = 0;
  for (let i = 0; i < buckets; i++) {
    const start = i * block;
    const end = Math.min(samples.length, start + block);
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(samples[j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
    if (max > peakMax) peakMax = max;
  }
  if (peakMax > 1e-9) {
    for (let i = 0; i < buckets; i++) peaks[i] /= peakMax;
  }
  return peaks;
}

export async function loadWaveformPeaks(
  url: string,
  buckets = 600
): Promise<{ peaks: Float32Array; duration: number }> {
  const buffer = await decodeAudioUrl(url);
  return { peaks: peaksFromBuffer(buffer, buckets), duration: buffer.duration };
}

/** Decode once for both waveform drawing and Web Audio playback. */
export async function loadAudioForMix(
  url: string,
  buckets = 600
): Promise<{ buffer: AudioBuffer; peaks: Float32Array; duration: number }> {
  const buffer = await decodeAudioUrl(url);
  return { buffer, peaks: peaksFromBuffer(buffer, buckets), duration: buffer.duration };
}

const mixCache = new Map<
  string,
  Promise<{ buffer: AudioBuffer; peaks: Float32Array; duration: number }>
>();

/** Same as loadAudioForMix, but reuses decoded buffers across players (e.g. shared bed). */
export function loadAudioForMixCached(url: string, buckets = 600) {
  const key = `${url}::${buckets}`;
  let pending = mixCache.get(key);
  if (!pending) {
    pending = loadAudioForMix(url, buckets).catch((err) => {
      mixCache.delete(key);
      throw err;
    });
    mixCache.set(key, pending);
  }
  return pending;
}
