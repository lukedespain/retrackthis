import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// GET /api/admin/creators/:userId/jobs — producer job list for admin preview
export async function GET(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const creator = await db.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, email: true },
  });
  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  const jobs = await db.job.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { takes: true } } },
  });

  return NextResponse.json({
    creator,
    jobs: jobs.map(({ _count, ...job }) => ({
      ...job,
      deadline: job.deadline.toISOString(),
      createdAt: job.createdAt.toISOString(),
      takeCount: _count.takes,
    })),
  });
}
