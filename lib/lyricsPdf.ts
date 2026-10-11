/** One-page-or-more lyric sheet. Helvetica, WinAnsi. */

function winAnsi(text: string): string {
  const map: Record<string, string> = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201C": '"',
    "\u201D": '"',
    "\u2013": "-",
    "\u2014": "-",
    "\u2026": "...",
    "\u00A0": " ",
  };
  let out = "";
  for (const ch of text) {
    const swapped = map[ch] ?? ch;
    const code = swapped.charCodeAt(0);
    if (code === 10) {
      out += "\n";
      continue;
    }
    if (code < 32 || code > 255) {
      out += "?";
      continue;
    }
    out += swapped;
  }
  return out;
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(line: string, width: number): string[] {
  if (!line) return [""];
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > width ? word.slice(0, width) : word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function lyricsPdf(title: string, lyrics: string): Uint8Array {
  const body = winAnsi(lyrics)
    .split("\n")
    .flatMap((line) => wrapLine(line, 78));
  const heading = winAnsi(title).slice(0, 80) || "Lyrics";
  const linesPerPage = 42;
  const pages: string[][] = [];
  for (let i = 0; i < body.length; i += linesPerPage) {
    pages.push(body.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([""]);

  const objects: string[] = [];
  const pageIds: number[] = [];
  // 1 catalog, 2 pages, 3 font, then each page + content
  objects.push(""); // 1
  objects.push(""); // 2
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((lines, index) => {
    const pageId = objects.length + 1;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    const commands = [
      "BT",
      "/F1 11 Tf",
      "72 740 Td",
      `(${pdfEscape(index === 0 ? heading : `${heading}  ${index + 1}`)}) Tj`,
      "/F1 12 Tf",
      "0 -28 Td",
    ];
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) commands.push("0 -16 Td");
      commands.push(`(${pdfEscape(line)}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
