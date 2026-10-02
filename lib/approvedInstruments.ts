import { db } from "@/lib/db";
import { isHiddenInstrument, listInstrumentAdjustments, visibleLabels } from "@/lib/instrumentOverrides";
import {
  isAllowedInstrumentId,
  labelForInstrumentId,
  makeCustomInstrumentId,
  parseCustomInstrumentId,
} from "@/lib/instruments";

export async function listApprovedInstruments() {
  return db.approvedInstrument.findMany({
    orderBy: { label: "asc" },
    select: { id: true, label: true, groupId: true },
  });
}

/** Catalog id, or an instrument an admin has added. Hidden instruments are not postable. */
export async function resolvePostableInstrument(id: string): Promise<{ id: string; label: string } | null> {
  const adjustments = await listInstrumentAdjustments();
  if (isHiddenInstrument(id, adjustments)) return null;
  if (isAllowedInstrumentId(id)) {
    return { id, label: adjustments.labels[id] ?? labelForInstrumentId(id) };
  }
  if (!parseCustomInstrumentId(id)) return null;
  const row = await db.approvedInstrument.findUnique({
    where: { id },
    select: { id: true, label: true },
  });
  if (!row) return null;
  return { id: row.id, label: adjustments.labels[row.id] ?? row.label };
}

export async function labelAlreadyOnSite(label: string): Promise<boolean> {
  const key = label.trim().toLowerCase();
  if (!key) return false;
  const labels = await visibleLabels();
  for (const name of labels.values()) {
    if (name.toLowerCase() === key) return true;
  }
  return false;
}

export function instrumentIdForApproval(groupId: string, label: string): string | null {
  return makeCustomInstrumentId(groupId, label);
}
