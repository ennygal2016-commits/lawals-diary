/**
 * MIME sniffing from magic bytes (PRD §6 "uploads checked by MIME sniffing"). The browser's file type and the file
 * name are never trusted.
 */
export type ImageKind = "jpeg" | "png" | "webp" | "heic";

export const IMAGE_MIME: Record<ImageKind, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

/** ISO-BMFF brands used by HEIC/HEIF stills from phones and cameras. AVIF ("avif") is deliberately not included. */
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

export function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a)
    return "png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (ascii(bytes, 4, 4) === "ftyp") {
    const boxSize = (bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!;
    const end = Math.min(bytes.length, boxSize > 0 ? boxSize : 32);
    // Major brand at 8, then compatible brands from 16 in steps of 4.
    const brands = [ascii(bytes, 8, 4)];
    for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(bytes, i, 4));
    if (brands.includes("avif") || brands.includes("avis")) return null;
    if (brands.some((b) => HEIF_BRANDS.has(b))) return "heic";
  }
  return null;
}
