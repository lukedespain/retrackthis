import {
  COMMUNITY_UPDATE_HERO_GIF,
  COMMUNITY_UPDATE_TEST_RECIPIENTS,
  firstNameFromDisplayName,
} from "@/lib/communityUpdateEmail";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";

export { COMMUNITY_UPDATE_HERO_GIF, COMMUNITY_UPDATE_TEST_RECIPIENTS };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Turn plain paragraphs into email HTML; supports {{firstName}}. */
export function plainBodyToHtml(plain: string) {
  const blocks = plain
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (!blocks.length) return "";

  return blocks
    .map((block) => {
      const withBreaks = escapeHtml(block).replace(/\n/g, "<br />");
      // Allow the personalization token through unescaped.
      const html = withBreaks.replace(/\{\{firstName\}\}/g, "{{firstName}}");
      return `<p style="margin:0 0 14px;">${html}</p>`;
    })
    .join("\n");
}

export function renderBodyHtml(templateHtml: string, firstName: string) {
  const name = escapeHtml(firstName.trim() || "there");
  return templateHtml.replace(/\{\{firstName\}\}/g, name);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BlastRecipient = { email: string; firstName: string };

export async function loadAllMemberRecipients(): Promise<BlastRecipient[]> {
  const users = await db.user.findMany({
    select: { email: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  const seen = new Set<string>();
  const recipients: BlastRecipient[] = [];
  for (const user of users) {
    const key = user.email.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    recipients.push({
      email: user.email.trim(),
      firstName: firstNameFromDisplayName(user.name),
    });
  }
  return recipients;
}

export function testRecipients(): BlastRecipient[] {
  return COMMUNITY_UPDATE_TEST_RECIPIENTS.map((r) => ({
    email: r.email,
    firstName: r.firstName,
  }));
}

export async function sendPersonalizedEmails(opts: {
  recipients: BlastRecipient[];
  subject: string;
  bodyHtmlTemplate: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  bottomImageUrl?: string | null;
}): Promise<{ sent: number; failed: Array<{ email: string; error: string }> }> {
  if (!emailConfigured()) {
    throw new Error("Email is not configured (RESEND_API_KEY missing).");
  }

  const failed: Array<{ email: string; error: string }> = [];
  let sent = 0;

  for (const recipient of opts.recipients) {
    try {
      await sendEmail({
        to: recipient.email,
        subject: opts.subject,
        includeSettingsFooter: false,
        bodyHtml: renderBodyHtml(opts.bodyHtmlTemplate, recipient.firstName),
        ctaLabel: opts.ctaLabel || undefined,
        ctaHref: opts.ctaHref || undefined,
        bottomImageUrl: opts.bottomImageUrl || undefined,
        bottomImageAlt: opts.bottomImageUrl ? "Retrack This" : undefined,
        bottomImageHref: opts.bottomImageUrl ? "https://retrackthis.com" : undefined,
      });
      sent += 1;
    } catch (err) {
      failed.push({
        email: recipient.email,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    await sleep(150);
  }

  return { sent, failed };
}
