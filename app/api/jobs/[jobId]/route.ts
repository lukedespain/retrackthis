import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/supabaseServer";

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

// PATCH /api/jobs/:jobId — creator or admin updates an OPEN job.
// Title, description, reference audio, and tempo only — never price or payment.
export async function PATCH(req: NextRequest, { params }: { params: { jobId: string } }) {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const job = await db.job.findUnique({ where: { id: params.jobId } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isOwner = job.creatorId === sessionUserId;
  const admin = isOwner ? null : await getAdminUser();
  if (!isOwner && !admin) {
    return NextResponse.json({ error: "Not authorized to edit this job" }, { status: 403 });
  }

  if (job.status !== "OPEN") {
    return NextResponse.json({ error: "Only open jobs can be edited" }, { status: 400 });
  }

  const body = await req.json();

  // Hard-block anything payment-related even if a client sends it.
  const blocked = [
    "priceCents",
    "price",
    "paymentMethodId",
    "payment",
    "stripePaymentIntentId",
    "platformFeeCents",
    "creatorId",
    "status",
  ];
  if (blocked.some((key) => key in body)) {
    return NextResponse.json(
      { error: "Price and payment details can’t be changed when editing a job." },
      { status: 400 }
    );
  }

  const data: {
    title?: string;
    description?: string;
    demoFileUrl?: string;
    backingFileUrl?: string | null;
    bpm?: number | null;
  } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title can’t be empty" }, { status: 400 });
    }
    data.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      return NextResponse.json({ error: "Description can’t be empty" }, { status: 400 });
    }
    data.description = body.description.trim();
  }

  if (body.demoFileUrl !== undefined) {
    if (!isHttpUrl(body.demoFileUrl)) {
      return NextResponse.json({ error: "Invalid part-being-retracked file" }, { status: 400 });
    }
    data.demoFileUrl = body.demoFileUrl.trim();
  }

  if (body.backingFileUrl !== undefined) {
    if (body.backingFileUrl === null || body.backingFileUrl === "") {
      data.backingFileUrl = null;
    } else if (!isHttpUrl(body.backingFileUrl)) {
      return NextResponse.json({ error: "Invalid background file" }, { status: 400 });
    } else {
      data.backingFileUrl = body.backingFileUrl.trim();
    }
  }

  if (body.bpm !== undefined) {
    if (body.bpm === null || body.bpm === "") {
      data.bpm = null;
    } else {
      const parsed = Number(body.bpm);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 400) {
        return NextResponse.json({ error: "BPM must be between 1 and 400" }, { status: 400 });
      }
      data.bpm = Math.round(parsed);
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await db.job.update({
    where: { id: job.id },
    data,
  });

  return NextResponse.json({ job: updated, editedByAdmin: Boolean(admin) });
}
