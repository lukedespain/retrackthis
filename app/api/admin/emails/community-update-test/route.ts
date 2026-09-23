import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  COMMUNITY_UPDATE_HEADING,
  COMMUNITY_UPDATE_SUBJECT,
  COMMUNITY_UPDATE_TEST_RECIPIENTS,
  communityUpdateBodyHtml,
} from "@/lib/communityUpdateEmail";
import { emailConfigured, sendEmail } from "@/lib/email";

/**
 * Admin: send the community update email to Luke + Hazel only (layout/copy QA).
 * POST /api/admin/emails/community-update-test
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

  const results: Array<{ email: string; ok: boolean; error?: string }> = [];

  for (const recipient of COMMUNITY_UPDATE_TEST_RECIPIENTS) {
    try {
      await sendEmail({
        to: recipient.email,
        subject: COMMUNITY_UPDATE_SUBJECT,
        heading: COMMUNITY_UPDATE_HEADING,
        includeSettingsFooter: false,
        bodyHtml: communityUpdateBodyHtml(recipient.firstName),
        ctaLabel: "Open Retrack This",
        ctaHref: "https://retrackthis.com",
      });
      results.push({ email: recipient.email, ok: true });
    } catch (err) {
      results.push({
        email: recipient.email,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    return NextResponse.json(
      { error: `Failed for ${failed.map((f) => f.email).join(", ")}`, results },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    to: results.map((r) => r.email),
  });
}
