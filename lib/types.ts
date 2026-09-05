import type { TakeFileRecord } from "@/lib/takeFiles";

export type Job = {
  id: string;
  creatorId: string;
  title: string;
  instrument: string;
  instrumentId?: string | null;
  description: string;
  demoFileUrl: string;
  /** Background / instrumental without the part being retracked */
  backingFileUrl?: string | null;
  priceCents: number;
  /** null = flexible tempo; number = fixed BPM */
  bpm: number | null;
  deadline: string;
  status: "OPEN" | "AWARDED" | "CANCELLED";
  createdAt: string;
  /** Number of musician submissions (public count only — audio stays private). */
  takeCount?: number;
};

export type Take = {
  id: string;
  jobId: string;
  musicianId: string;
  audioFileUrl: string;
  note: string | null;
  isWinner: boolean;
  submittedAt: string;
  musician: { id: string; name: string };
  files?: TakeFileRecord[];
};

export type MyTake = {
  id: string;
  jobId: string;
  audioFileUrl: string;
  note: string | null;
  isWinner: boolean;
  submittedAt: string;
  files?: TakeFileRecord[];
  job: {
    id: string;
    title: string;
    instrument: string;
    priceCents: number;
    bpm: number | null;
    status: "OPEN" | "AWARDED" | "CANCELLED";
  };
};
