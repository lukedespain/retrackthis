/** Client-safe metronome helpers for listen + download-with-click. */

export function beatIntervalSec(bpm: number) {
  return 60 / Math.max(1, bpm);
}

/** Short percussive click into an AudioContext (live or offline). */
export function scheduleClick(
  ctx: BaseAudioContext,
  when: number,
  {
    accent = false,
    gain = 0.22,
  }: { accent?: boolean; gain?: number } = {}
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = accent ? 1320 : 880;
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0008, when + (accent ? 0.045 : 0.03));
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + 0.05);
}

/** Schedule quarter-note clicks from t=0 through durationSec (audio timeline). */
export function scheduleMetronomeClicks(
  ctx: BaseAudioContext,
  bpm: number,
  durationSec: number,
  audioTimelineOffset = 0
) {
  const interval = beatIntervalSec(bpm);
  let beat = 0;
  for (let t = 0; t < durationSec + 0.001; t += interval) {
    const accent = beat % 4 === 0;
    scheduleClick(ctx, audioTimelineOffset + t, { accent, gain: accent ? 0.28 : 0.18 });
    beat += 1;
  }
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

/** Encode OfflineAudioContext render as a downloadable WAV. */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

export async function mixAudioUrlWithClick(src: string, bpm: number): Promise<Blob> {
  const res = await fetch(src);
  if (!res.ok) throw new Error("Couldn’t load audio for download");
  const arrayBuffer = await res.arrayBuffer();

  const probe = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await probe.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await probe.close().catch(() => undefined);
  }

  const offline = new OfflineAudioContext(
    decoded.numberOfChannels,
    decoded.length,
    decoded.sampleRate
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);

  scheduleMetronomeClicks(offline, bpm, decoded.duration, 0);

  const rendered = await offline.startRendering();
  return audioBufferToWavBlob(rendered);
}

export function withClickFilename(name: string) {
  const cleaned = name.replace(/\.[^.]+$/, "");
  return `${cleaned}-with-click.wav`;
}
