import { appBaseUrl } from "@/lib/appUrl";

type SendEmailInput = {
  to: string;
  subject: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Default: notification settings footer. Pass false for transactional invites. */
  includeSettingsFooter?: boolean;
};

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail({
  to,
  subject,
  heading,
  bodyHtml,
  ctaLabel,
  ctaHref,
  includeSettingsFooter = true,
}: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] skipped (RESEND_API_KEY not set):", subject, "→", to);
    return;
  }

  const from = process.env.RESEND_FROM?.trim() || "RetrackThis <hello@retrackthis.com>";
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || "music@lukedespain.com";
  const settingsUrl = `${appBaseUrl()}/dashboard/settings`;

  const footer = includeSettingsFooter
    ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">
        You’re getting this because of your RetrackThis notification settings.
        <a href="${escapeAttr(settingsUrl)}" style="color:#6b7280;">Manage alerts</a>
      </p>`
    : `<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">
        Sent via RetrackThis · <a href="${escapeAttr(appBaseUrl())}" style="color:#6b7280;">retrackthis.com</a>
      </p>`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f7f8;font-family:Inter,system-ui,-apple-system,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <p style="margin:0 0 24px;font-size:13px;font-weight:600;letter-spacing:0.04em;color:#5B4BFF;">RetrackThis</p>
      <div style="background:#ffffff;border-radius:16px;padding:28px 24px;box-shadow:0 1px 2px rgba(16,24,40,0.04);">
        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;">${escapeHtml(heading)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#4b5563;">${bodyHtml}</div>
        ${
          ctaHref && ctaLabel
            ? `<p style="margin:24px 0 0;"><a href="${escapeAttr(ctaHref)}" style="display:inline-block;background:#5B4BFF;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:999px;">${escapeHtml(ctaLabel)}</a></p>`
            : ""
        }
      </div>
      ${footer}
    </div>
  </body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, reply_to: replyTo, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body || res.statusText}`);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}
