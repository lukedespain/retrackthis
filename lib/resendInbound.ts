import { createHmac, timingSafeEqual } from "crypto";

const FORWARD_TO = process.env.RESEND_REPLY_TO?.trim() || "music@lukedespain.com";
const FORWARD_FROM = process.env.RESEND_FROM?.trim() || "RetrackThis <hello@retrackthis.com>";

type ReceivedEmail = {
  id: string;
  from: string;
  to?: string[];
  subject?: string | null;
  html?: string | null;
  text?: string | null;
};

export function verifyResendWebhook(payload: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) {
    throw new Error("Missing Resend webhook signature headers");
  }

  const secretPart = secret.includes("_") ? secret.slice(secret.indexOf("_") + 1) : secret;
  const key = Buffer.from(secretPart, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64");

  const passed = signatureHeader.split(" ").some((part) => {
    const value = part.includes(",") ? part.slice(part.indexOf(",") + 1) : part;
    const a = Buffer.from(expected);
    const b = Buffer.from(value);
    return a.length === b.length && timingSafeEqual(a, b);
  });

  if (!passed) throw new Error("Invalid Resend webhook signature");
}

export async function forwardReceivedEmail(emailId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const received = await resendGet<ReceivedEmail>(`/emails/receiving/${emailId}`, apiKey);
  const fromAddress = extractAddress(received.from);
  if (!fromAddress) throw new Error("Inbound email missing from address");

  // Don't bounce our own sends back through Gmail in a loop.
  if (fromAddress.toLowerCase() === "hello@retrackthis.com") return;
  if (fromAddress.toLowerCase() === FORWARD_TO.toLowerCase()) return;

  const subject = received.subject?.trim() || "(no subject)";
  const intro = `Forwarded from hello@retrackthis.com<br>Originally from: ${escapeHtml(received.from)}`;
  const html =
    received.html?.trim() ||
    (received.text ? `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(received.text)}</pre>` : "");

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FORWARD_FROM,
      to: FORWARD_TO,
      reply_to: fromAddress,
      subject: subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`,
      html: `<p style="font-size:13px;color:#6b7280;">${intro}</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />${html}`,
    }),
  });

  if (!sendRes.ok) {
    const body = await sendRes.text().catch(() => "");
    throw new Error(`Forward send failed (${sendRes.status}): ${body}`);
  }
}

async function resendGet<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new Error(json.message ?? `Resend GET ${path} failed (${res.status})`);
  }
  return json;
}

function extractAddress(from: string) {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] || from).trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
