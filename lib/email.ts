import { appBaseUrl } from "@/lib/appUrl";

type SendEmailInput = {
  to: string;
  subject: string;
  /** Optional; omit to skip the h1 (body can open with greeting). */
  heading?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Optional image below the CTA (e.g. hero GIF). Absolute URL. */
  bottomImageUrl?: string;
  bottomImageAlt?: string;
  bottomImageHref?: string;
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
  bottomImageUrl,
  bottomImageAlt,
  bottomImageHref,
  includeSettingsFooter = true,
}: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] skipped (RESEND_API_KEY not set):", subject, "→", to);
    return;
  }

  const from = process.env.RESEND_FROM?.trim() || "Retrack This <hello@retrackthis.com>";
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || "hello@retrackthis.com";
  const settingsUrl = `${appBaseUrl()}/settings`;
  const fontStack =
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

  // Brand: light = #5F4AFF / soft #eeecff; dark = #a397ff / soft #2a2654
  const footer = includeSettingsFooter
    ? `<p class="email-footer" style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;font-family:${fontStack};">
        You’re getting this because of your Retrack This notification settings.
        <a href="${escapeAttr(settingsUrl)}" style="color:#6b7280;">Manage alerts</a>
      </p>`
    : `<p class="email-footer" style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;font-family:${fontStack};">
        Sent via Retrack This · <a href="${escapeAttr(appBaseUrl())}" style="color:#6b7280;">retrackthis.com</a>
      </p>`;

  const bottomImg = bottomImageUrl
    ? `<p style="margin:24px 0 0;line-height:0;">${
        bottomImageHref
          ? `<a href="${escapeAttr(bottomImageHref)}" style="text-decoration:none;">`
          : ""
      }<img src="${escapeAttr(bottomImageUrl)}" width="512" height="154" alt="${escapeAttr(
        bottomImageAlt || ""
      )}" style="display:block;width:100%;max-width:512px;height:auto;border:0;border-radius:10px;" />${
        bottomImageHref ? "</a>" : ""
      }</p>`
    : "";

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      :root { color-scheme: light dark; }
      .email-shell { background-color: #eeecff !important; }
      .email-card { background-color: #ffffff !important; }
      .email-cta { background-color: #5F4AFF !important; color: #ffffff !important; }
      @media (prefers-color-scheme: dark) {
        .email-shell { background-color: #2a2654 !important; }
        .email-card { background-color: #111827 !important; }
        .email-body, .email-body p { color: #d1d5db !important; }
        .email-section { color: #f3f4f6 !important; }
        .email-cta { background-color: #a397ff !important; color: #111827 !important; }
        .email-footer, .email-footer a { color: #9ca3af !important; }
        .email-body a { color: #a397ff !important; }
      }
    </style>
    <!--[if mso]>
    <style type="text/css">
      body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
    </style>
    <![endif]-->
  </head>
  <body class="email-shell" style="margin:0;padding:0;background:#eeecff;font-family:${fontStack};color:#111827;">
    <div class="email-shell" style="max-width:560px;margin:0 auto;padding:20px 14px;background:#eeecff;font-family:${fontStack};">
      <div class="email-card" style="background:#ffffff;border-radius:16px;padding:28px 24px;box-shadow:0 1px 2px rgba(16,24,40,0.04);font-family:${fontStack};">
        ${
          heading?.trim()
            ? `<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;font-family:${fontStack};">${escapeHtml(heading.trim())}</h1>`
            : ""
        }
        <div class="email-body" style="font-size:15px;line-height:1.6;color:#4b5563;font-family:${fontStack};">${bodyHtml}</div>
        ${
          ctaHref && ctaLabel
            ? `<p style="margin:24px 0 0;"><a class="email-cta" href="${escapeAttr(ctaHref)}" style="display:inline-block;background:#5F4AFF;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:999px;font-family:${fontStack};">${escapeHtml(ctaLabel)}</a></p>`
            : ""
        }
        ${bottomImg}
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
