import { NextRequest, NextResponse } from "next/server";
import { forwardReceivedEmail, verifyResendWebhook } from "@/lib/resendInbound";

/**
 * Resend inbound webhook.
 * Dashboard: https://retrackthis.com/api/webhooks/resend
 * Event: email.received
 * Forwards mail sent to hello@retrackthis.com → music@lukedespain.com
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend webhook] RESEND_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const payload = await req.text();

  try {
    verifyResendWebhook(payload, req.headers, secret);
  } catch (err) {
    console.error("[resend webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(payload) as { type?: string; data?: { email_id?: string } };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ received: true, ignored: event.type ?? "unknown" });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  try {
    await forwardReceivedEmail(emailId);
  } catch (err) {
    console.error("[resend webhook] forward failed", err);
    return NextResponse.json({ error: "Forward failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
