import { NextResponse } from "next/server";
import { getNetworkInstruments } from "@/lib/instrumentNetwork";

// Always resolve against the live instrument network (don't freeze at build).
export const dynamic = "force-dynamic";

// GET /api/instruments - catalog split by network availability
export async function GET() {
  const { available, comingSoon } = await getNetworkInstruments();
  return NextResponse.json({ available, comingSoon });
}
