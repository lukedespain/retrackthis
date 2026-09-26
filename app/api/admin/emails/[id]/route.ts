import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/** GET /api/admin/emails/:id */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const blast = await db.emailBlast.findUnique({ where: { id: params.id } });
  if (!blast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let failures: Array<{ email: string; error: string }> = [];
  if (blast.failuresJson) {
    try {
      failures = JSON.parse(blast.failuresJson) as typeof failures;
    } catch {
      failures = [];
    }
  }

  return NextResponse.json({
    blast: {
      ...blast,
      createdAt: blast.createdAt.toISOString(),
      failures,
    },
  });
}
