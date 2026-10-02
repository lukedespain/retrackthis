import { NextResponse } from "next/server";
import { listApprovedInstruments } from "@/lib/approvedInstruments";
import { listInstrumentAdjustments } from "@/lib/instrumentOverrides";

export async function GET() {
  const [instruments, adjustments] = await Promise.all([
    listApprovedInstruments(),
    listInstrumentAdjustments(),
  ]);
  const hidden = new Set(adjustments.hidden);
  return NextResponse.json({
    instruments: instruments
      .filter((item) => !hidden.has(item.id))
      .map((item) => ({ ...item, label: adjustments.labels[item.id] ?? item.label })),
    labels: adjustments.labels,
    hidden: adjustments.hidden,
  });
}
