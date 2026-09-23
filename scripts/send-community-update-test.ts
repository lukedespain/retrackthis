/**
 * One-shot local test (needs RESEND_API_KEY). Prefer admin button on production.
 * Run: npx tsx scripts/send-community-update-test.ts
 */
import {
  COMMUNITY_UPDATE_HEADING,
  COMMUNITY_UPDATE_SUBJECT,
  communityUpdateBodyHtml,
} from "../lib/communityUpdateEmail";
import { emailConfigured, sendEmail } from "../lib/email";

const TO = "music@lukedespain.com";
const FIRST_NAME = "Luke";

async function main() {
  console.log("emailConfigured?", emailConfigured());
  if (!emailConfigured()) {
    throw new Error(
      "RESEND_API_KEY missing locally. Use Admin → Send community update test on production instead."
    );
  }

  await sendEmail({
    to: TO,
    subject: COMMUNITY_UPDATE_SUBJECT,
    heading: COMMUNITY_UPDATE_HEADING,
    includeSettingsFooter: false,
    bodyHtml: communityUpdateBodyHtml(FIRST_NAME),
    ctaLabel: "Open Retrack This",
    ctaHref: "https://retrackthis.com",
  });

  console.log("sent test community update →", TO);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
