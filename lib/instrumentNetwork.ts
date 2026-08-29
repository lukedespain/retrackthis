import { db } from "@/lib/db";
import { buildNetworkInstrumentList, normalizeInstrumentId } from "@/lib/instruments";

export async function getMusicianCountsByInstrument(): Promise<Record<string, number>> {
  const users = await db.user.findMany({
    where: { instruments: { isEmpty: false } },
    select: { instruments: true },
  });

  const counts: Record<string, number> = {};
  for (const user of users) {
    const ids = new Set(user.instruments.map(normalizeInstrumentId));
    for (const id of ids) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

export async function getNetworkInstruments() {
  const musicianCounts = await getMusicianCountsByInstrument();
  return buildNetworkInstrumentList(musicianCounts);
}
