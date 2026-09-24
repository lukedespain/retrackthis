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

/**
 * Admin: send the community update to every member (personalized greeting).
 * POST /api/admin/emails/community-update-blast
 */
export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY missing)." },
      { status: 503 }
    );
  }

  const users = await db.user.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  // Dedupe by email (case-insensitive).
  const seen = new Set<string>();
  const recipients: Array<{ email: string; firstName: string }> = [];
  for (const user of users) {
    const email = user.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email: user.email.trim(),
      firstName: firstNameFromDisplayName(user.name),
    });
  }

  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  // Small concurrency so Resend stays happy and we finish under the function limit.
  const CONCURRENCY = 4;
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const chunk = recipients.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (recipient) => {
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
          return { email: recipient.email, ok: true as const };
        } catch (err) {
          return {
            email: recipient.email,
            ok: false as const,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );
    results.push(...chunkResults);
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
