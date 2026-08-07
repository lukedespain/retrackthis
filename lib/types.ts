export type Job = {
  id: string;
  creatorId: string;
  title: string;
  instrument: string;
  description: string;
  demoFileUrl: string;
  priceCents: number;
  deadline: string;
  status: "OPEN" | "AWARDED" | "CANCELLED";
  createdAt: string;
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
};

export type MyTake = {
  id: string;
  audioFileUrl: string;
  note: string | null;
  isWinner: boolean;
  submittedAt: string;
  job: {
    id: string;
    title: string;
    instrument: string;
    priceCents: number;
    status: "OPEN" | "AWARDED" | "CANCELLED";
  };
};
