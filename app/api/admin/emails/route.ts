import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  COMMUNITY_UPDATE_HERO_GIF,
  loadAllMemberRecipients,
  plainBodyToHtml,
  sendPersonalizedEmails,
  testRecipients,
} from "@/lib/adminEmailBlast";
import { db } from "@/lib/db";
import { emailConfigured } from "@/lib/email";

export const maxDuration = 60;

/** GET /api/admin/emails?kind=TEST|BLAST|all */
export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");

  const blasts = await db.emailBlast.findMany({
    where: kind === "TEST" || kind === "BLAST" ? { kind } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      kind: true,
      subject: true,
      sentCount: true,
      failedCount: true,
      recipientEmails: true,
      sentByName: true,
      createdAt: true,
      ctaLabel: true,
      bottomImageUrl: true,
    },
  });

  return NextResponse.json({
    blasts: blasts.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      recipientCount: b.kind === "TEST" ? b.recipientEmails.length : b.sentCount + b.failedCount,
    })),
  });
}

type PostBody = {
  mode?: "test" | "blast";
  subject?: string;
  bodyPlain?: string;
  includeHeroGif?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
};

/** POST /api/admin/emails — compose + send test or full blast, then store history. */
export async function POST(req: Request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY missing)." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as PostBody;
  const mode = body.mode === "blast" ? "blast" : "test";
  const subject = (body.subject ?? "").trim();
  const bodyPlain = (body.bodyPlain ?? "").trim();

  if (!subject) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }
  if (!bodyPlain) {
    return NextResponse.json({ error: "Body is required." }, { status: 400 });
  }

  const fullPlain = `Hi {{firstName}},\n\n${bodyPlain}`;
  const bodyHtml = plainBodyToHtml(fullPlain);

  const ctaLabel = (body.ctaLabel ?? "").trim() || "Open Retrack This";
  const ctaHref = (body.ctaHref ?? "").trim() || "https://retrackthis.com";
  const bottomImageUrl = body.includeHeroGif ? COMMUNITY_UPDATE_HERO_GIF : null;

  const recipients = mode === "blast" ? await loadAllMemberRecipients() : testRecipients();
  if (!recipients.length) {
    return NextResponse.json({ error: "No recipients found." }, { status: 400 });
  }

  const result = await sendPersonalizedEmails({
    recipients,
    subject,
    bodyHtmlTemplate: bodyHtml,
    ctaLabel,
    ctaHref,
    bottomImageUrl,
  });

  const blast = await db.emailBlast.create({
    data: {
      kind: mode === "blast" ? "BLAST" : "TEST",
      subject,
      bodyPlain: fullPlain,
      bodyHtml,
      ctaLabel,
      ctaHref,
      bottomImageUrl,
      sentCount: result.sent,
      failedCount: result.failed.length,
      recipientEmails: recipients.map((r) => r.email),
      failuresJson: result.failed.length ? JSON.stringify(result.failed) : null,
      sentById: admin.id,
      sentByName: admin.name,
    },
  });

  return NextResponse.json({
    ok: result.failed.length === 0,
    id: blast.id,
    kind: blast.kind,
    sent: result.sent,
    failed: result.failed.length,
    total: recipients.length,
    failures: result.failed,
  });
}
