import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { labelForInstrumentId } from "@/lib/instruments";

// GET /api/admin/members — all users with job/take counts and instruments
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      instruments: true,
      isAdmin: true,
      createdAt: true,
      stripeAccountId: true,
      _count: {
        select: {
          jobsPosted: true,
          takesSubmitted: true,
        },
      },
    },
  });

  const wins = await db.take.groupBy({
    by: ["musicianId"],
    where: { isWinner: true },
    _count: { _all: true },
  });
  const winsByUser = new Map(wins.map((w) => [w.musicianId, w._count._all]));

  const members = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
    hasPayouts: Boolean(u.stripeAccountId),
    jobsPosted: u._count.jobsPosted,
    takesSubmitted: u._count.takesSubmitted,
    jobsWon: winsByUser.get(u.id) ?? 0,
    instruments: u.instruments.map((id) => ({
      id,
      label: labelForInstrumentId(id),
    })),
  }));

  return NextResponse.json({ members, total: members.length });
}
