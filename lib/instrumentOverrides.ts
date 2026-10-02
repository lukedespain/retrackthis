import { db } from "@/lib/db";
import { INSTRUMENT_CATALOG, labelForInstrumentId, type InstrumentAdjustments } from "@/lib/instruments";

export const ACTIVE_JOB_STATUSES = ["OPEN", "AWARDING", "PENDING_PAYMENT"] as const;

export async function listInstrumentAdjustments(): Promise<InstrumentAdjustments> {
  const rows = await db.instrumentOverride.findMany({
    select: { id: true, label: true, hidden: true },
  });
  const labels: Record<string, string> = {};
  const hidden: string[] = [];
  for (const row of rows) {
    if (row.hidden) hidden.push(row.id);
    else if (row.label) labels[row.id] = row.label;
  }
  return { labels, hidden };
}

export function displayLabel(id: string, adjustments: InstrumentAdjustments): string {
  return adjustments.labels[id] ?? labelForInstrumentId(id);
}

export async function visibleInstrumentLabel(id: string): Promise<string> {
  const adjustments = await listInstrumentAdjustments();
  return displayLabel(id, adjustments);
}

export function isHiddenInstrument(id: string, adjustments: InstrumentAdjustments): boolean {
  return adjustments.hidden.includes(id);
}

/** Names still shown in pickers, including admin renames. */
export async function visibleLabels(): Promise<Map<string, string>> {
  const adjustments = await listInstrumentAdjustments();
  const hidden = new Set(adjustments.hidden);
  const labels = new Map<string, string>();
  for (const item of INSTRUMENT_CATALOG) {
    if (hidden.has(item.id)) continue;
    labels.set(item.id, adjustments.labels[item.id] ?? item.label);
  }
  const approved = await db.approvedInstrument.findMany({ select: { id: true, label: true } });
  for (const row of approved) {
    if (hidden.has(row.id)) continue;
    labels.set(row.id, adjustments.labels[row.id] ?? row.label);
  }
  return labels;
}
