const KEY = "rt-post-draft";

export type PostJobDraftPart = {
  key: string;
  instrumentId: string | null;
  demoFileUrl: string | null;
  backingFileUrl: string | null;
  notes: string;
  durationSeconds: number | null;
  fileDurationSeconds: number | null;
  deadlineDays: number;
  priceDollars: number;
};

export type PostJobDraft = {
  step: number;
  title: string;
  musicalKey: string;
  bpm: string;
  fixedTempo: boolean;
  instrumentId: string | null;
  demoFileUrl: string | null;
  backingFileUrl: string | null;
  description: string;
  durationSeconds: number | null;
  partFileSeconds: number | null;
  deadlineText: string;
  priceDollars: number;
  inviteEmail: string;
  more: PostJobDraftPart[];
};

export function readPostDraft(): PostJobDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PostJobDraft;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePostDraft(draft: PostJobDraft) {
  window.localStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearPostDraft() {
  window.localStorage.removeItem(KEY);
}
