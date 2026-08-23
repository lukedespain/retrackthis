export const MAX_AUDIO_TAKES = 3;
export const MAX_MIDI_FILES = 3;

export type TakeFileKind = "AUDIO" | "MIDI";

export type TakeFileInput = {
  label: string;
  fileUrl: string;
  audioIndex?: number | null;
};

export type TakeFileRecord = {
  id: string;
  kind: TakeFileKind;
  label: string;
  fileUrl: string;
  sortOrder: number;
  audioIndex?: number | null;
};

export function parseTakeFileInputs(value: unknown, kind: TakeFileKind, max: number): TakeFileInput[] {
  if (!Array.isArray(value)) return [];
  const items: TakeFileInput[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const label = String((entry as { label?: unknown }).label ?? "").trim();
    const fileUrl = String((entry as { fileUrl?: unknown }).fileUrl ?? "").trim();
    if (!label || !fileUrl) continue;
    const rawIndex = (entry as { audioIndex?: unknown }).audioIndex;
    const audioIndex =
      rawIndex === null || rawIndex === undefined
        ? kind === "MIDI"
          ? null
          : undefined
        : Number(rawIndex);
    items.push({
      label,
      fileUrl,
      ...(kind === "MIDI" ? { audioIndex: Number.isFinite(audioIndex) ? audioIndex : null } : {}),
    });
    if (items.length >= max) break;
  }
  return items;
}

export function audioFiles(files: TakeFileRecord[]) {
  return files.filter((f) => f.kind === "AUDIO").sort((a, b) => a.sortOrder - b.sortOrder);
}

export function midiFiles(files: TakeFileRecord[]) {
  return files.filter((f) => f.kind === "MIDI").sort((a, b) => a.sortOrder - b.sortOrder);
}

export function sharedMidiFile(files: TakeFileRecord[]) {
  return midiFiles(files).find((f) => f.audioIndex == null) ?? null;
}

export function pairedTakeRows(files: TakeFileRecord[]) {
  const audio = audioFiles(files);
  const midi = midiFiles(files);
  const shared = sharedMidiFile(files);
  const legacyMidi = midi.filter((f) => f.audioIndex == null && !shared);

  return audio.map((audioFile, index) => ({
    audio: audioFile,
    midi: midi.find((f) => f.audioIndex === index) ?? null,
  }));
}

export function unpairedMidiFiles(files: TakeFileRecord[]) {
  const midi = midiFiles(files);
  const audioCount = audioFiles(files).length;
  return midi.filter((f) => f.audioIndex == null || f.audioIndex >= audioCount);
}
