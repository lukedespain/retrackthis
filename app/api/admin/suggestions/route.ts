import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { instrumentIdForApproval, labelAlreadyOnSite } from "@/lib/approvedInstruments";
import { db } from "@/lib/db";
import { INSTRUMENT_GROUPS, sanitizeInstrumentIds } from "@/lib/instruments";

const GROUP_IDS = new Set(INSTRUMENT_GROUPS.map((group) => group.id));

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [instruments, features] = await Promise.all([
    db.instrumentSuggestion.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.featureRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return NextResponse.json({ instruments, features });
}

export async function PATCH(req: NextRequest) {
  const { admin, error } = await requireAdmin();
  if (error || !admin) return error;

  const body = await req.json().catch(() => null);
  const kind = body?.kind === "feature" ? "feature" : body?.kind === "instrument" ? "instrument" : null;
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action === "approve" ? "approve" : body?.action === "deny" ? "deny" : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!kind || !id || !action) {
    return NextResponse.json({ error: "Missing review details." }, { status: 400 });
  }
  if (action === "deny" && note.length < 2) {
    return NextResponse.json({ error: "Add a short note explaining why." }, { status: 400 });
  }

  if (kind === "instrument") {
    const suggestion = await db.instrumentSuggestion.findUnique({ where: { id } });
    if (!suggestion) return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    if (suggestion.status !== "PENDING") {
      return NextResponse.json({ error: "That suggestion was already reviewed." }, { status: 409 });
    }

    if (action === "deny") {
      const updated = await db.instrumentSuggestion.update({
        where: { id },
        data: {
          status: "DENIED",
          adminNote: note,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json({ suggestion: updated });
    }

    const groupId = typeof body?.groupId === "string" && GROUP_IDS.has(body.groupId) ? body.groupId : "";
    if (!groupId) return NextResponse.json({ error: "Pick a group for this instrument." }, { status: 400 });
    if (await labelAlreadyOnSite(suggestion.label)) {
      return NextResponse.json({ error: "That instrument is already on the site." }, { status: 409 });
    }
    const instrumentId = instrumentIdForApproval(groupId, suggestion.label);
    if (!instrumentId) {
      return NextResponse.json({ error: "Could not make an id from that name." }, { status: 400 });
    }

    const existing = await db.approvedInstrument.findUnique({ where: { id: instrumentId } });
    if (existing) {
      return NextResponse.json({ error: "That instrument is already on the site." }, { status: 409 });
    }

    await db.$transaction(async (tx) => {
      await tx.approvedInstrument.create({
        data: {
          id: instrumentId,
          label: suggestion.label,
          groupId,
          suggestionId: suggestion.id,
        },
      });
      await tx.instrumentSuggestion.update({
        where: { id: suggestion.id },
        data: {
          status: "APPROVED",
          groupId,
          instrumentId,
          adminNote: note || null,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
      const owner = await tx.user.findUnique({
        where: { id: suggestion.userId },
        select: { instruments: true },
      });
      if (owner) {
        const next = sanitizeInstrumentIds([...owner.instruments, instrumentId]);
        await tx.user.update({
          where: { id: suggestion.userId },
          data: { instruments: next },
        });
      }
    });

    return NextResponse.json({ ok: true, instrumentId });
  }

  const request = await db.featureRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "That request was already reviewed." }, { status: 409 });
  }

  const updated = await db.featureRequest.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "DENIED",
      adminNote: note || null,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });
  return NextResponse.json({ request: updated });
}
