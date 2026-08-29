import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getMusicianCountsByInstrument } from "@/lib/instrumentNetwork";
import {
  INSTRUMENT_CATALOG,
  groupForInstrumentId,
  isCustomInstrumentId,
  labelForInstrumentId,
} from "@/lib/instruments";

// GET /api/admin/instruments — coverage across catalog + custom write-ins
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const counts = await getMusicianCountsByInstrument();

  const covered: Array<{
    id: string;
    label: string;
    groupLabel: string;
    musicianCount: number;
    custom: boolean;
  }> = [];
  const needed: typeof covered = [];

  for (const item of INSTRUMENT_CATALOG) {
    const musicianCount = counts[item.id] ?? 0;
    const group = groupForInstrumentId(item.id);
    const row = {
      id: item.id,
      label: item.label,
      groupLabel: group?.label ?? "Other",
      musicianCount,
      custom: false,
    };
    if (musicianCount > 0) covered.push(row);
    else needed.push(row);
  }

  // Custom instruments musicians added that aren't in the catalog
  for (const [id, musicianCount] of Object.entries(counts)) {
    if (!isCustomInstrumentId(id)) continue;
    if (musicianCount <= 0) continue;
    const group = groupForInstrumentId(id);
    covered.push({
      id,
      label: labelForInstrumentId(id),
      groupLabel: group?.label ?? "Other",
      musicianCount,
      custom: true,
    });
  }

  covered.sort((a, b) => b.musicianCount - a.musicianCount || a.label.localeCompare(b.label));
  needed.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel) || a.label.localeCompare(b.label));

  return NextResponse.json({
    covered,
    needed,
    summary: {
      catalogTotal: INSTRUMENT_CATALOG.length,
      coveredCount: covered.filter((c) => !c.custom).length,
      neededCount: needed.length,
      musiciansOnCustom: covered.filter((c) => c.custom).length,
    },
  });
}
