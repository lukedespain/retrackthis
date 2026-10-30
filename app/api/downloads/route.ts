import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasLyrics } from "@/lib/lyrics";
import { lyricsPdf } from "@/lib/lyricsPdf";
import { cleanFileName } from "@/lib/downloadNames";
import { assertAppStorageUrls } from "@/lib/storageUrls";
import { getSessionUserId } from "@/lib/supabaseServer";
import { zipFiles } from "@/lib/zipFiles";

export const maxDuration = 60;

type Item = { id?: string; url?: string; filename?: string; lyrics?: boolean };

// POST /api/downloads — one file, or a zip of the part, the bed, and a lyric sheet.
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title : "RetrackThis";
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  const items: Item[] = Array.isArray(body?.items) ? body.items : [];
  if (!jobId || items.length === 0) {
    return NextResponse.json({ error: "Nothing to download" }, { status: 400 });
  }

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { title: true, lyrics: true, demoFileUrl: true, backingFileUrl: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const packed: Array<{ name: string; data: Uint8Array }> = [];
  for (const item of items) {
    if (item.lyrics) {
      if (!hasLyrics(job.lyrics)) continue;
      packed.push({
        name: cleanFileName(`${job.title} - Lyrics.pdf`, "lyrics.pdf"),
        data: lyricsPdf(job.title, job.lyrics as string),
      });
      continue;
    }
    if (typeof item.url !== "string" || !item.url.trim()) continue;
    const url = item.url.trim();
    const err = assertAppStorageUrls([url]);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    const audio = await fetch(url);
    if (!audio.ok) return NextResponse.json({ error: "Could not read a file." }, { status: 502 });
    const data = new Uint8Array(await audio.arrayBuffer());
    const fallback = url.split("?")[0].split("/").pop() || "file";
    packed.push({ name: cleanFileName(typeof item.filename === "string" ? item.filename : fallback, fallback), data });
  }

  if (packed.length === 0) return NextResponse.json({ error: "Nothing to download" }, { status: 400 });

  if (packed.length === 1 && packed[0].name.endsWith(".pdf")) {
    return new NextResponse(Buffer.from(packed[0].data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${packed[0].name}"`,
      },
    });
  }

  const zip = zipFiles(packed);
  const zipName = cleanFileName(`${title || job.title}.zip`, "retrackthis.zip");
  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
    },
  });
}
