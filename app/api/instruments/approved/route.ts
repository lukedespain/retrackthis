import { NextResponse } from "next/server";
import { listApprovedInstruments } from "@/lib/approvedInstruments";

export async function GET() {
  const instruments = await listApprovedInstruments();
  return NextResponse.json({ instruments });
}
