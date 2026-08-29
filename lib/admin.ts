import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createServerSupabaseClient, getSessionUserId } from "@/lib/supabaseServer";

const DEFAULT_ADMIN_EMAILS = ["music@lukedespain.com"];

/** Comma-separated ADMIN_EMAILS env, plus the default bootstrap account. */
export function adminEmailAllowlist(): Set<string> {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv]);
}

export function emailIsAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailAllowlist().has(email.trim().toLowerCase());
}

/**
 * Ensures allowlisted emails get isAdmin=true in the DB (idempotent).
 * Returns the signed-in admin profile, or null if not admin.
 */
export async function getAdminUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let profile = await db.user.findUnique({ where: { id: userId } });
  if (!profile) return null;

  const allowlisted = emailIsAdmin(authUser?.email ?? profile.email);
  if (allowlisted && !profile.isAdmin) {
    profile = await db.user.update({
      where: { id: userId },
      data: { isAdmin: true },
    });
  }

  if (!profile.isAdmin && !allowlisted) return null;
  return profile;
}

export async function requireAdmin() {
  const admin = await getAdminUser();
  if (!admin) {
    return {
      admin: null as null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { admin, error: null as null };
}
