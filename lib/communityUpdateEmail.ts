/** Shared HTML body for the community product-update email. */
export function communityUpdateBodyHtml(firstName: string) {
  const name = escape(firstName.trim() || "there");
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:#5F4AFF;text-decoration:underline;">${escape(label)}</a>`;

  return `
      <p style="margin:0 0 14px;">Hi ${name},</p>
      <p style="margin:0 0 14px;">Thanks for being early with us. We’ve been listening to how you’ve been using Retrack This, and a lot of what you’re about to see came straight from that feedback.</p>
      <p style="margin:0 0 14px;">The big change is how payment works. When a producer posts a job, they pay up front now. We dropped the old “7 day escrow hold” approach where producers could end the gig early. That method was confusing and put musicians on a clock that was unfair and inconsistent. Now, the funds sit with us until someone is awarded, and if a job is cancelled or nobody wins, the producer gets refunded.</p>
      <p style="margin:18px 0 6px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#111827;">Producers</p>
      <p style="margin:0 0 14px;">Now that jobs stay open for the full deadline that you set, you can “favorite” whichever submission you like most as they arrive. Once the deadline hits, you have a 48 hour window to confirm your selection and “award” a musician. If you have a submission favorited but don’t ever confirm before the window closes, then we’ll automatically award that musician. If you never selected a favorite, and the window closes, the job is cancelled and you are refunded.</p>
      <p style="margin:18px 0 6px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#111827;">Musicians</p>
      <p style="margin:0 0 14px;">Submitting is still free. (Yay!) You just need to set up payouts in ${link("https://retrackthis.com/settings", "Settings")} before you submit so we know where to send money if you win. You can check the status of your submission anytime, and it’ll show as either pending, awarded, not selected, or cancelled.</p>
      <p style="margin:0 0 10px;">There’s more detail on the FAQ if you want it, and the Terms and Privacy pages are up to date too:</p>
      <p style="margin:0 0 14px;">
        ${link("https://retrackthis.com/faq", "FAQ")}<br />
        ${link("https://retrackthis.com/terms", "Terms")}<br />
        ${link("https://retrackthis.com/privacy", "Privacy")}
      </p>
      <p style="margin:0 0 14px;">If something still feels off, just reply to this email. We’re a small team that reads every email.</p>
      <p style="margin:0 0 14px;">Thanks again for helping us shape this.</p>
      <p style="margin:0;">Hazel<br />CPO, Retrack This</p>
    `;
}

export const COMMUNITY_UPDATE_SUBJECT = "We heard you — here’s what’s new on Retrack This";
export const COMMUNITY_UPDATE_HEADING = "A quick Retrack This update";

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
