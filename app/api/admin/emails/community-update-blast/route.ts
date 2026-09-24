import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  COMMUNITY_UPDATE_HERO_GIF,
  COMMUNITY_UPDATE_SUBJECT,
  communityUpdateBodyHtml,
  firstNameFromDisplayName,
} from "@/lib/communityUpdateEmail";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";

export const maxDuration = 60;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Admin: send the community update to every member (personalized greeting).
 * Optional body: `{ emails?: string[] }` to send only those addresses (retry).
 * POST /api/admin/emails/community-update-blast
 *
 * Resend free tier: 10 req/sec — we send sequentially with a short gap.
 */
export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY missing)." },
      { status: 503 }
    );
  }

  let onlyEmails: Set<string> | null = null;
  try {
    const body = (await req.json().catch(() => null)) as { emails?: string[] } | null;
    if (body?.emails?.length) {
      onlyEmails = new Set(body.emails.map((e) => e.trim().toLowerCase()).filter(Boolean));
    }
  } catch {
    // no body
  }

  const users = await db.user.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const seen = new Set<string>();
  const recipients: Array<{ email: string; firstName: string }> = [];
  for (const user of users) {
    const email = user.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    if (onlyEmails && !onlyEmails.has(email)) continue;
    seen.add(email);
    recipients.push({
      email: user.email.trim(),
      firstName: firstNameFromDisplayName(user.name),
    });
  }

  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient.email,
        subject: COMMUNITY_UPDATE_SUBJECT,
        includeSettingsFooter: false,
        bodyHtml: communityUpdateBodyHtml(recipient.firstName),
        ctaLabel: "Open Retrack This",
        ctaHref: "https://retrackthis.com",
        bottomImageUrl: COMMUNITY_UPDATE_HERO_GIF,
        bottomImageAlt: "Retrack This — post a part, compare takes, pick your favorite",
        bottomImageHref: "https://retrackthis.com",
      });
      results.push({ email: recipient.email, ok: true });
    } catch (err) {
      results.push({
        email: recipient.email,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // Stay under Resend’s 10 req/sec limit.
    await sleep(150);
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    ok: failed.length === 0,
    sent,
    failed: failed.length,
    total: recipients.length,
    failures: failed,
  });
}
