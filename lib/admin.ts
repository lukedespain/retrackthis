import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createServerSupabaseClient, getSessionUserId } from "@/lib/supabaseServer";

const DEFAULT_ADMIN_EMAILS = ["music@lukedespain.com", "dabthenatural@gmail.com"];

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

  const email = authUser?.email ?? profile.email;
  const allowlisted = emailIsAdmin(email);
  // Require a confirmed email before bootstrapping admin from the allowlist
  // (stops signup-as-allowlisted-address before owning the inbox).
  const emailConfirmed = Boolean(authUser?.email_confirmed_at);
  if (allowlisted && emailConfirmed && !profile.isAdmin) {
    profile = await db.user.update({
      where: { id: userId },
      data: { isAdmin: true },
    });
  }

  if (profile.isAdmin) return profile;
  if (allowlisted && emailConfirmed) return profile;
  return null;
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
