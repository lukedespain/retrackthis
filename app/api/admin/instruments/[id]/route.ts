import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  ACTIVE_JOB_STATUSES,
  displayLabel,
  listInstrumentAdjustments,
  visibleLabels,
} from "@/lib/instrumentOverrides";
import {
  groupForInstrumentId,
  isTestInstrumentId,
  labelForInstrumentId,
  normalizeInstrumentId,
} from "@/lib/instruments";

type Ctx = { params: { id: string } };

function peopleCountLabel(count: number) {
  return count === 1 ? "1 person has" : `${count} people have`;
}

async function holders(id: string) {
  const users = await db.user.findMany({
    where: { instruments: { isEmpty: false } },
    select: { id: true, name: true, email: true, instruments: true },
    orderBy: { name: "asc" },
  });
  return users.filter((user) =>
    user.instruments.some((item) => item === id || normalizeInstrumentId(item) === id)
  );
}

async function activeJobs(id: string, names: string[]) {
  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  const rows = await db.job.findMany({
    where: {
      status: { in: [...ACTIVE_JOB_STATUSES] },
      OR: [
        { instrumentId: id },
        ...uniqueNames.map((name) => ({
          instrumentId: null,
          instrument: { equals: name, mode: "insensitive" as const },
        })),
      ],
    },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  return rows;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = decodeURIComponent(params.id);
  const adjustments = await listInstrumentAdjustments();
  if (adjustments.hidden.includes(id)) {
    return NextResponse.json({ error: "That instrument was removed." }, { status: 404 });
  }
  const labels = await visibleLabels();
  if (!labels.has(id) && !groupForInstrumentId(id)) {
    return NextResponse.json({ error: "Instrument not found." }, { status: 404 });
  }

  const label = labels.get(id) ?? displayLabel(id, adjustments);
  const original = labelForInstrumentId(id);
  const [musicians, jobs] = await Promise.all([holders(id), activeJobs(id, [label, original])]);
  const alternatives = Array.from(labels.entries())
    .filter(([instrumentId]) => instrumentId !== id)
    .map(([instrumentId, name]) => ({
      id: instrumentId,
      label: name,
      groupLabel: groupForInstrumentId(instrumentId)?.label ?? "Other",
    }))
    .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel) || a.label.localeCompare(b.label));

  return NextResponse.json({
    id,
    label,
    groupLabel: groupForInstrumentId(id)?.label ?? "Other",
    musicians: musicians.map((user) => ({ id: user.id, name: user.name, email: user.email })),
    musicianCount: musicians.length,
    activeJobs: jobs,
    alternatives,
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = decodeURIComponent(params.id);
  if (isTestInstrumentId(id)) {
    return NextResponse.json({ error: "The test instrument can’t be renamed." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim().replace(/\s+/g, " ") : "";
  const acknowledgeProfiles = body?.acknowledgeProfiles === true;
  if (label.length < 2 || label.length > 48) {
    return NextResponse.json({ error: "Use a name between 2 and 48 characters." }, { status: 400 });
  }

  const adjustments = await listInstrumentAdjustments();
  if (adjustments.hidden.includes(id)) {
    return NextResponse.json({ error: "That instrument was removed." }, { status: 404 });
  }
  const labels = await visibleLabels();
  if (!labels.has(id) && !groupForInstrumentId(id)) {
    return NextResponse.json({ error: "Instrument not found." }, { status: 404 });
  }

  const current = labels.get(id) ?? labelForInstrumentId(id);
  if (current.toLowerCase() === label.toLowerCase()) {
    return NextResponse.json({ ok: true, label: current });
  }
  for (const [otherId, name] of labels) {
    if (otherId !== id && name.toLowerCase() === label.toLowerCase()) {
      return NextResponse.json({ error: "Another instrument already uses that name." }, { status: 409 });
    }
  }

  const musicians = await holders(id);
  if (musicians.length > 0 && !acknowledgeProfiles) {
    return NextResponse.json(
      {
        code: "profiles",
        musicianCount: musicians.length,
        error: `${peopleCountLabel(musicians.length)} this on their profile.`,
      },
      { status: 409 }
    );
  }

  const original = labelForInstrumentId(id);
  await db.$transaction(async (tx) => {
    await tx.instrumentOverride.upsert({
      where: { id },
      create: { id, label, hidden: false },
      update: { label, hidden: false },
    });
    await tx.approvedInstrument.updateMany({ where: { id }, data: { label } });
    await tx.job.updateMany({
      where: {
        OR: [
          { instrumentId: id },
          { instrumentId: null, instrument: { equals: original, mode: "insensitive" } },
          { instrumentId: null, instrument: { equals: current, mode: "insensitive" } },
        ],
      },
      data: { instrument: label, instrumentId: id },
    });
  });

  return NextResponse.json({ ok: true, label });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = decodeURIComponent(params.id);
  if (isTestInstrumentId(id)) {
    return NextResponse.json({ error: "The test instrument can’t be deleted." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const acknowledgeProfiles = body?.acknowledgeProfiles === true;
  const replacementId = typeof body?.replacementId === "string" ? body.replacementId : "";

  const adjustments = await listInstrumentAdjustments();
  const labels = await visibleLabels();
  if (adjustments.hidden.includes(id) || (!labels.has(id) && !groupForInstrumentId(id))) {
    return NextResponse.json({ error: "Instrument not found." }, { status: 404 });
  }

  const label = labels.get(id) ?? labelForInstrumentId(id);
  const original = labelForInstrumentId(id);
  const [musicians, jobs] = await Promise.all([holders(id), activeJobs(id, [label, original])]);

  if (jobs.length > 0 && (!replacementId || replacementId === id || !labels.has(replacementId))) {
    return NextResponse.json(
      {
        code: "jobs",
        musicianCount: musicians.length,
        jobs: jobs.map((job) => ({ id: job.id, title: job.title, status: job.status })),
        error: jobs.length === 1 ? "This is on an active job." : `This is on ${jobs.length} active jobs.`,
      },
      { status: 409 }
    );
  }
  if (musicians.length > 0 && !acknowledgeProfiles) {
    return NextResponse.json(
      {
        code: "profiles",
        musicianCount: musicians.length,
        error: `${peopleCountLabel(musicians.length)} this on their profile.`,
      },
      { status: 409 }
    );
  }

  const replacementLabel = replacementId ? labels.get(replacementId) ?? null : null;
  if (jobs.length > 0 && !replacementLabel) {
    return NextResponse.json({ error: "Pick what the active jobs should say instead." }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    if (jobs.length > 0 && replacementId && replacementLabel) {
      await tx.job.updateMany({
        where: { id: { in: jobs.map((job) => job.id) } },
        data: { instrumentId: replacementId, instrument: replacementLabel },
      });
    }
    for (const user of musicians) {
      const next = user.instruments.filter((item) => item !== id && normalizeInstrumentId(item) !== id);
      if (next.length !== user.instruments.length) {
        await tx.user.update({ where: { id: user.id }, data: { instruments: next } });
      }
    }
    await tx.instrumentOverride.upsert({
      where: { id },
      create: { id, label: null, hidden: true },
      update: { label: null, hidden: true },
    });
    await tx.approvedInstrument.deleteMany({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
