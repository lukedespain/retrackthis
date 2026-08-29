import { NextResponse } from "next/server";
import { getNetworkInstruments } from "@/lib/instrumentNetwork";

// GET /api/instruments — catalog split by network availability
export async function GET() {
  const { available, comingSoon } = await getNetworkInstruments();
  return NextResponse.json({ available, comingSoon });
}
