// Meta Conversions API: sends Purchase from the server when a paid job opens,
// so it still counts when the browser pixel is blocked or the tab is closed.
// The browser fires the same event with the same event_id (app/producers/page.tsx),
// and Meta keeps one of the two.
//
// Env: META_CAPI_ACCESS_TOKEN (required to send), META_PIXEL_ID (defaults to the
// site pixel), META_CAPI_TEST_EVENT_CODE (optional: routes events to Test Events).
import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { META_PIXEL_ID } from "@/lib/metaPixel";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

const sha = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

/**
 * Browser details saved on the Checkout session when it's created, because the
 * Stripe webhook that opens the job has no browser of its own to read them from.
 */
export function metaCheckoutMetadata(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  const fbp = req.cookies.get("_fbp")?.value;
  const fbc = req.cookies.get("_fbc")?.value;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ua = req.headers.get("user-agent");
  if (fbp) out.meta_fbp = fbp.slice(0, 200);
  if (fbc) out.meta_fbc = fbc.slice(0, 200);
  if (ip) out.meta_ip = ip.slice(0, 100);
  if (ua) out.meta_ua = ua.slice(0, 450);
  return out;
}

export async function sendMetaPurchase(session: Stripe.Checkout.Session, jobIds: string[]) {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || META_PIXEL_ID;
  if (!token || jobIds.length === 0) return;

  const meta = session.metadata ?? {};
  let email = session.customer_details?.email ?? null;
  if (!email && meta.creatorId) {
    const creator = await db.user.findUnique({ where: { id: meta.creatorId }, select: { email: true } });
    email = creator?.email ?? null;
  }

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `purchase_${session.id}`,
        action_source: "website",
        event_source_url: "https://retrackthis.com/producers",
        user_data: {
          em: email ? [sha(email)] : undefined,
          external_id: meta.creatorId ? [sha(meta.creatorId)] : undefined,
          client_ip_address: meta.meta_ip || undefined,
          client_user_agent: meta.meta_ua || undefined,
          fbp: meta.meta_fbp || undefined,
          fbc: meta.meta_fbc || undefined,
        },
        custom_data: {
          value: (session.amount_total ?? 0) / 100,
          currency: (session.currency ?? "usd").toUpperCase(),
          content_type: "job",
          content_ids: jobIds,
        },
      },
    ],
  };
  if (process.env.META_CAPI_TEST_EVENT_CODE) body.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.warn("[meta-capi] purchase", res.status, (await res.text()).slice(0, 300));
  } catch (err) {
    // Never fail a checkout because Meta is slow or down.
    console.warn("[meta-capi] purchase", err);
  }
}
