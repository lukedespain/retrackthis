import { isAppStoragePublicUrl } from "@/lib/storageUrls";

const MAX_BYTES = 24 * 1024 * 1024;

/** Whisper transcription of a vocal part. Returns null when no API key is configured. */
export async function transcribePartLyrics(fileUrl: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !isAppStoragePublicUrl(fileUrl)) return null;

  const audio = await fetch(fileUrl);
  if (!audio.ok) throw new Error("Could not read the vocal part.");
  const bytes = await audio.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) throw new Error("That vocal part is too long to transcribe.");

  const name = fileUrl.split("?")[0].split("/").pop() || "part.mp3";
  const form = new FormData();
  form.append("file", new Blob([bytes]), name);
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
