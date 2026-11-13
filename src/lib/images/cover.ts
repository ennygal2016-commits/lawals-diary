import sharp from "sharp";

import { PhotoError } from "./photo";
import { sniffImage } from "./sniff";

export const COVER_MAX_BYTES = 10 * 1024 * 1024;

/** Book covers: sniffed, HEIC converted, oriented, ≤ 800 px, WebP, all metadata stripped. */
export async function processCover(input: Buffer): Promise<Buffer> {
  if (input.byteLength === 0) throw new PhotoError("That file is empty.");
  if (input.byteLength > COVER_MAX_BYTES) throw new PhotoError("Covers can be up to 10 MB.");
  const kind = sniffImage(input);
  if (!kind) throw new PhotoError("Choose a JPEG, PNG, WebP or HEIC image.");
  let source = input;
  if (kind === "heic") {
    const { default: convert } = await import("heic-convert");
    source = Buffer.from(await convert({ buffer: new Uint8Array(input), format: "JPEG", quality: 0.92 }));
  }
  try {
    return await sharp(source, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();
  } catch {
    throw new PhotoError("That image couldn’t be read.");
  }
}
