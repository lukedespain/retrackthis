import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  COMMUNITY_UPDATE_HEADING,
  COMMUNITY_UPDATE_SUBJECT,
  communityUpdateBodyHtml,
} from "@/lib/communityUpdateEmail";
import { emailConfigured, sendEmail } from "@/lib/email";

/** Hardcoded test recipient — never broaden without an explicit allowlist. */
const TEST_TO = "music@lukedespain.com";
const TEST_FIRST_NAME = "Luke";

/**
 * Admin: send the community update email to Luke only (layout/copy QA).
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

  await sendEmail({
    to: TEST_TO,
    subject: COMMUNITY_UPDATE_SUBJECT,
    heading: COMMUNITY_UPDATE_HEADING,
    includeSettingsFooter: false,
    bodyHtml: communityUpdateBodyHtml(TEST_FIRST_NAME),
    ctaLabel: "Open Retrack This",
    ctaHref: "https://retrackthis.com",
  });

  return NextResponse.json({ ok: true, to: TEST_TO });
}
