import { NextRequest, NextResponse } from "next/server";
import { runJobMaintenance } from "@/lib/jobActions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron. Set CRON_SECRET in the project env.
 * Schedule is in vercel.json. Does not run on anonymous page loads.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runJobMaintenance();
  } catch (err) {
    console.error("[cron jobs]", err);
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
