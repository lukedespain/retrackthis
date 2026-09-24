/** Shared HTML body for the community product-update email. */
export function communityUpdateBodyHtml(firstName: string) {
  const name = escape(firstName.trim() || "there");
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:#5F4AFF;text-decoration:underline;">${escape(label)}</a>`;
  const sectionLabel = (label: string) =>
    `<p class="email-section" style="margin:18px 0 6px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#111827;">${escape(label)}</p>`;

  return `
      <p style="margin:0 0 14px;">Hi ${name},</p>
      <p style="margin:0 0 14px;">Thanks for being early with us, and for the feedback that shaped this update!</p>
      ${sectionLabel("What’s new?")}
      <p style="margin:0 0 14px;">Producers now pay upfront when they post a job. We hold onto the funds until someone is awarded. If the job gets cancelled or nothing gets selected, the producer is refunded automatically.</p>
      <p style="margin:0 0 14px;">We made this change for a couple reasons. It gets rid of the gigs ending early, which put musicians on an unpredictable clock. And it gives producers more flexibility with the deadline length (no more 7 day max window).</p>
      ${sectionLabel("For producers")}
      <p style="margin:0 0 14px;">As submissions roll in, you can favorite the one you like best. Once the deadline passes, you have 48 hours to confirm your pick. If you don’t, we’ll automatically award it to the submission you favorited, or refund you if you haven’t favorited one.</p>
      ${sectionLabel("For musicians")}
      <p style="margin:0 0 14px;">The job stays open until the deadline. So if you’re in the middle of practicing a part, you don’t have to worry about it closing early.</p>
      <p style="margin:0 0 14px;">If you want the full details, our ${link("https://retrackthis.com/faq", "FAQ")}, ${link("https://retrackthis.com/terms", "Terms")}, and ${link("https://retrackthis.com/privacy", "Privacy")} pages are up-to-date.</p>
      <p style="margin:0 0 14px;">If anything looks buggy or seems off, reply to this email. We’re a small team and appreciate any feedback or input you have!</p>
      <p style="margin:0 0 14px;">Thanks again for helping us shape this.</p>
      <p style="margin:0;">Retrack This team</p>
    `;
}

export const COMMUNITY_UPDATE_SUBJECT = "We heard you, here's what's new!";
export const COMMUNITY_UPDATE_HERO_GIF =
  "https://retrackthis.com/brand/retrackthis-hero-email.gif?v=20260924c";

/** First word of display name, or "there". */
export function firstNameFromDisplayName(name: string | null | undefined) {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

/** Test recipients only — never broaden without an explicit allowlist. */
export const COMMUNITY_UPDATE_TEST_RECIPIENTS = [
  { email: "music@lukedespain.com", firstName: "Luke" },
  { email: "hazeldespain@gmail.com", firstName: "Hazel" },
] as const;

function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
