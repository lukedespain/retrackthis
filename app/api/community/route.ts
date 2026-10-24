import { NextResponse } from "next/server";
import { cleanAvatar } from "@/lib/avatar";
import { db } from "@/lib/db";
import { visibleLabels } from "@/lib/instrumentOverrides";
import { normalizeInstrumentId } from "@/lib/instruments";

// Public list for the homepage community. Only what the card shows: first name +
// last initial, the avatar recipe, and visible instrument names. No ids or emails.
// Refreshed every 5 minutes, so a Settings opt-out shows within that window.
export const revalidate = 300;

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  // Some people type their name in lowercase; capitalize so the list looks consistent.
  const first = parts[0][0].toUpperCase() + parts[0].slice(1);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export async function GET() {
  const [users, labels] = await Promise.all([
    db.user.findMany({
      where: { showInCommunity: true, NOT: { instruments: { isEmpty: true } } },
      select: { name: true, avatar: true, instruments: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    visibleLabels(),
  ]);

  const musicians = users
    .map((user) => {
      const instruments = Array.from(new Set(user.instruments.map(normalizeInstrumentId)))
        .map((id) => labels.get(id))
        .filter((label): label is string => Boolean(label));
      return { name: shortName(user.name), avatar: cleanAvatar(user.avatar), instruments };
    })
    .filter((m) => m.name && m.instruments.length > 0);

  return NextResponse.json({ musicians });
}
