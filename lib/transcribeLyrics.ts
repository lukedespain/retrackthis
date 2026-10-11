import { spawn } from "child_process";
import { existsSync, promises as fs } from "fs";
import os from "os";
import path from "path";
import ffmpegStatic from "ffmpeg-static";
import { isAppStoragePublicUrl } from "@/lib/storageUrls";

const MAX_BYTES = 24 * 1024 * 1024;

function ffmpegPath(): string | null {
  const candidates = [
    ffmpegStatic,
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
  ];
  return candidates.find((candidate) => typeof candidate === "string" && existsSync(candidate)) ?? null;
}

function speechUrlFor(fileUrl: string): string {
  return fileUrl.replace(/\.[^./?]+(?=(\?|$))/, ".speech.mp3");
}

async function toSpeechMp3(input: Buffer, name: string): Promise<{ bytes: Buffer; filename: string }> {
  if (input.byteLength <= MAX_BYTES) {
    return { bytes: input, filename: name };
  }
  const bin = ffmpegPath();
  if (!bin) throw new Error("ffmpeg binary is not available on this server");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lyrics-"));
  const src = path.join(dir, name.replace(/[^\w.]+/g, "-") || "part");
  const out = path.join(dir, "speech.mp3");
  await fs.writeFile(src, input);
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        bin,
        ["-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-codec:a", "libmp3lame", "-b:a", "64k", out],
        { stdio: ["ignore", "ignore", "pipe"] }
      );
      let stderr = "";
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Could not prepare the vocal for transcription. ${stderr.slice(-200)}`));
      });
    });
    const bytes = await fs.readFile(out);
    if (bytes.byteLength > MAX_BYTES) throw new Error("That vocal part is too long to transcribe.");
    return { bytes, filename: "speech.mp3" };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

/** Whisper transcription of a vocal part. Returns null when no API key is configured. */
export async function transcribePartLyrics(fileUrl: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !isAppStoragePublicUrl(fileUrl)) return null;

  const head = await fetch(fileUrl, { method: "HEAD" });
  const length = Number(head.headers.get("content-length"));
  let sourceUrl = fileUrl;
  if (Number.isFinite(length) && length > MAX_BYTES) {
    const lighter = speechUrlFor(fileUrl);
    const speech = await fetch(lighter, { method: "HEAD" });
    const speechLength = Number(speech.headers.get("content-length"));
    if (speech.ok && Number.isFinite(speechLength) && speechLength > 0 && speechLength <= MAX_BYTES) {
      sourceUrl = lighter;
    }
  }

  const audio = await fetch(sourceUrl);
  if (!audio.ok) throw new Error("Could not read the vocal part.");
  const original = Buffer.from(await audio.arrayBuffer());
  const name = sourceUrl.split("?")[0].split("/").pop() || "part.mp3";
  const prepared = await toSpeechMp3(original, name);
  if (prepared.bytes.byteLength > MAX_BYTES) throw new Error("That vocal part is too long to transcribe.");

  const form = new FormData();
  form.append("file", new Blob([Uint8Array.from(prepared.bytes)]), prepared.filename);
  form.append("model", "whisper-1");
  form.append("response_format", "text");
  form.append("prompt", "Song lyrics.");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[transcribe]", res.status, detail.slice(0, 300));
    throw new Error("Could not transcribe that vocal.");
  }
  const text = (await res.text()).replace(/\r\n/g, "\n").trim();
  return text || null;
}
