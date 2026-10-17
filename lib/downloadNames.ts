// Readable names for downloaded files. Storage keeps files as
// "<uuid>-<upload name>", so downloads are named after the job instead,
// e.g. "Song Title - Part.wav".

const MAX_STEM = 80;

/** Lowercase extension from a file name or URL ("wav"), or "" if none. */
export function fileExtension(nameOrUrl: string): string {
  const path = nameOrUrl.split(/[?#]/)[0];
  const last = path.split("/").pop() ?? "";
  const match = /\.([a-z0-9]{1,5})$/i.exec(last);
  return match ? match[1].toLowerCase() : "";
}

/** Strip characters file systems reject and shorten the name without ever cutting the extension. */
export function cleanFileName(name: string, fallback = "file"): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || fallback;
  const ext = fileExtension(cleaned);
  const stem = ext ? cleaned.slice(0, -(ext.length + 1)) : cleaned;
  const short = stem.slice(0, MAX_STEM).trim() || fallback;
  return ext ? `${short}.${ext}` : short;
}

/** "Song Title - Part.wav", taking the extension from the stored file. */
export function jobFileName(title: string, role: string, src: string): string {
  const ext = fileExtension(src);
  const base = title.trim() ? `${title.trim()} - ${role}` : role;
  return cleanFileName(ext ? `${base}.${ext}` : base, role.toLowerCase());
}
