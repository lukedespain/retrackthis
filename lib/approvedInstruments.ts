import { db } from "@/lib/db";
import {
  catalogHasLabel,
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

/** Catalog id, or an instrument an admin has added. */
export async function resolvePostableInstrument(id: string): Promise<{ id: string; label: string } | null> {
  if (isAllowedInstrumentId(id)) {
    return { id, label: labelForInstrumentId(id) };
  }
  if (!parseCustomInstrumentId(id)) return null;
  const row = await db.approvedInstrument.findUnique({
    where: { id },
    select: { id: true, label: true },
  });
  return row;
}

export async function labelAlreadyOnSite(label: string): Promise<boolean> {
  if (catalogHasLabel(label)) return true;
  const key = label.trim().toLowerCase();
  const approved = await db.approvedInstrument.findMany({ select: { label: true } });
  return approved.some((row) => row.label.toLowerCase() === key);
}

export function instrumentIdForApproval(groupId: string, label: string): string | null {
  return makeCustomInstrumentId(groupId, label);
}
