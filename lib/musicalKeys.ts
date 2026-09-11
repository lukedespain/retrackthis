/** Canonical musical keys for job posts. Store the `id` in Job.musicalKey. */

export type MusicalKeyOption = {
  id: string;
  label: string;
};

const ROOTS = [
  { id: "C", label: "C" },
  { id: "C#", label: "C♯ / D♭" },
  { id: "D", label: "D" },
  { id: "Eb", label: "E♭ / D♯" },
  { id: "E", label: "E" },
  { id: "F", label: "F" },
  { id: "F#", label: "F♯ / G♭" },
  { id: "G", label: "G" },
  { id: "Ab", label: "A♭ / G♯" },
  { id: "A", label: "A" },
  { id: "Bb", label: "B♭ / A♯" },
  { id: "B", label: "B" },
] as const;

export const MUSICAL_KEYS: MusicalKeyOption[] = ROOTS.flatMap((root) => [
  { id: `${root.id}-major`, label: `${root.label} major` },
  { id: `${root.id}-minor`, label: `${root.label} minor` },
]);

const BY_ID = new Set(MUSICAL_KEYS.map((k) => k.id));

export function isAllowedMusicalKey(id: string | null | undefined): boolean {
  if (!id) return false;
  return BY_ID.has(id);
}

export function labelForMusicalKey(id: string | null | undefined): string | null {
  if (!id) return null;
  return MUSICAL_KEYS.find((k) => k.id === id)?.label ?? null;
}

export function sanitizeMusicalKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id) return null;
  return isAllowedMusicalKey(id) ? id : null;
}
