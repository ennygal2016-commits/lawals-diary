// Generates the PWA / favicon icons from one SVG: two rings in accent-ink on the accent colour.
// Run: node scripts/generate-icons.mjs  (outputs are committed; re-run only if the mark changes)
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const ACCENT = "#ff8a9b";
const INK = "#1a0e12";

/** @param {{ size: number, radius: number, scale: number }} o  scale = share of the canvas the rings span */
function svg({ size, radius, scale }) {
  const w = size * scale; // rings span
  const r = w / 3.4; // two circles overlapping like the wordmark (34 x 22 viewBox, r = 9)
  const cx = size / 2;
  const cy = size / 2;
  const dx = (w / 34) * 6; // centre offset (11 → 17 → 23 in the 34-wide mark)
  const stroke = Math.max(2, size * 0.035);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${ACCENT}"/>
  <circle cx="${cx - dx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="${stroke}"/>
  <circle cx="${cx + dx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-opacity="0.75"/>
</svg>`;
}

const png = (s, out) => sharp(Buffer.from(s)).png({ compressionLevel: 9 }).toFile(out);

// "any" icons: rounded square; maskable: full bleed with the mark inside the 80% safe zone.
await png(svg({ size: 192, radius: 40, scale: 0.62 }), "public/icons/icon-192.png");
await png(svg({ size: 512, radius: 108, scale: 0.62 }), "public/icons/icon-512.png");
await png(svg({ size: 512, radius: 0, scale: 0.5 }), "public/icons/maskable-512.png");
// iOS adds its own rounding.
await png(svg({ size: 180, radius: 0, scale: 0.6 }), "src/app/apple-icon.png");
await writeFile("src/app/icon.svg", svg({ size: 64, radius: 14, scale: 0.7 }) + "\n");
console.log("icons written");
