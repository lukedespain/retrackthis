import { listApprovedInstruments } from "@/lib/approvedInstruments";
import { db } from "@/lib/db";
import { listInstrumentAdjustments } from "@/lib/instrumentOverrides";
import { buildNetworkInstrumentList, groupForInstrumentId, normalizeInstrumentId } from "@/lib/instruments";

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
  const [musicianCounts, adjustments, approved] = await Promise.all([
    getMusicianCountsByInstrument(),
    listInstrumentAdjustments(),
    listApprovedInstruments(),
  ]);
  const hidden = new Set(adjustments.hidden);
  const list = buildNetworkInstrumentList(musicianCounts);
  // Admin-approved instruments (like Melodica) count too, not just the built-in catalog.
  for (const row of approved) {
    const musicianCount = musicianCounts[row.id] ?? 0;
    const status = musicianCount > 0 ? ("available" as const) : ("coming-soon" as const);
    const entry = {
      id: row.id,
      label: row.label,
      emoji: "",
      aliases: [],
      groupId: row.groupId,
      groupLabel: groupForInstrumentId(row.id)?.label ?? "Other",
      musicianCount,
      status,
    };
    (status === "available" ? list.available : list.comingSoon).push(entry);
  }
  const apply = <T extends { id: string; label: string }>(rows: T[]) =>
    rows
      .filter((row) => !hidden.has(row.id))
      .map((row) => ({ ...row, label: adjustments.labels[row.id] ?? row.label }));
  return { available: apply(list.available), comingSoon: apply(list.comingSoon) };
}
