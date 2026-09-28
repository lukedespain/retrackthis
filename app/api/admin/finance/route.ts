import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { loadFinanceBreakdown } from "@/lib/adminFinance";

export const maxDuration = 60;

type Period = "7d" | "30d" | "90d" | "all";

function periodStart(raw: string | null): Date | null {
  const period: Period =
    raw === "7d" || raw === "30d" || raw === "90d" || raw === "all" ? raw : "30d";
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// GET /api/admin/finance?period=7d|30d|90d|all - read-only; never moves money.
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const breakdown = await loadFinanceBreakdown(
      periodStart(req.nextUrl.searchParams.get("period"))
    );
    return NextResponse.json(breakdown);
  } catch (err) {
    console.error("[admin finance]", err);
    return NextResponse.json(
      { error: "Couldn’t load Stripe balance transactions." },
      { status: 502 }
    );
  }
}
