import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandDir = join(root, "brand");
const outDir = join(brandDir, "png");

const exports = [
  {
    input: "logo-mark.svg",
    outputs: [
      { name: "retrackthis-icon-512.png", width: 512 },
      { name: "retrackthis-icon-1024.png", width: 1024 },
    ],
  },
  {
    input: "logo-full.svg",
    outputs: [
      { name: "retrackthis-logo-dark-680.png", width: 680, transparent: true },
      { name: "retrackthis-logo-dark-1360.png", width: 1360, transparent: true },
      { name: "retrackthis-logo-dark-on-white-680.png", width: 680, background: "#FFFFFF" },
      { name: "retrackthis-logo-dark-on-white-1360.png", width: 1360, background: "#FFFFFF" },
    ],
  },
  {
    input: "logo-full-white.svg",
    outputs: [
      { name: "retrackthis-logo-white-680.png", width: 680, transparent: true },
      { name: "retrackthis-logo-white-1360.png", width: 1360, transparent: true },
      { name: "retrackthis-logo-white-on-dark-680.png", width: 680, background: "#111827" },
      { name: "retrackthis-logo-white-on-dark-1360.png", width: 1360, background: "#111827" },
    ],
  },
];

async function renderPng(svg, { width, transparent, background }) {
  let pipeline = sharp(svg).resize({ width, background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : background });
  if (background && !transparent) {
    pipeline = pipeline.flatten({ background });
  }
  return pipeline.png().toBuffer();
}

await mkdir(outDir, { recursive: true });

for (const item of exports) {
  const svg = await readFile(join(brandDir, item.input));
  for (const output of item.outputs) {
    const png = await renderPng(svg, output);
    await writeFile(join(outDir, output.name), png);
    console.log(`Wrote ${output.name}`);
  }
}
