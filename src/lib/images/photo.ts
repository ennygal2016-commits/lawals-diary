import sharp from "sharp";

import { PHOTO_MAX_MB } from "./accept";
import { type ImageKind, sniffImage } from "./sniff";

/**
 * The photo pipeline (PRD FR-23/24, DESIGN.md §8):
 * sniff the real type → convert HEIC → apply orientation to the pixels → strip ALL metadata → 400, 1200 and
 * 2400 px, each as WebP and JPEG. sharp writes no EXIF/XMP/IPTC/ICC unless asked; we never ask. The original is
 * never stored.
 */
export const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024;
export const PHOTO_SIZES = [400, 1200, 2400] as const;
export type PhotoSize = (typeof PHOTO_SIZES)[number];
export const PHOTO_FORMATS = ["webp", "jpeg"] as const;
export type PhotoFormat = (typeof PHOTO_FORMATS)[number];
export const PHOTO_EXT: Record<PhotoFormat, string> = { webp: "webp", jpeg: "jpg" };
export const PHOTO_CONTENT_TYPE: Record<PhotoFormat, string> = { webp: "image/webp", jpeg: "image/jpeg" };

const MAX_INPUT_PIXELS = 100_000_000;

export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoError";
  }
}

export type ProcessedPhoto = {
  kind: ImageKind;
  /** Oriented size of the source. */
  width: number;
  height: number;
  variants: Record<PhotoSize, Record<PhotoFormat, Buffer>>;
};

/** HEIC → JPEG. heic-convert (libheif in WebAssembly) applies the HEIF rotation/mirror itself. */
async function heicToJpeg(input: Buffer): Promise<Buffer> {
  const { default: convert } = await import("heic-convert");
  try {
    const out = await convert({ buffer: new Uint8Array(input), format: "JPEG", quality: 0.95 });
    return Buffer.from(out);
  } catch {
    throw new PhotoError("That HEIC photo couldn’t be read.");
  }
}

export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  if (input.byteLength === 0) throw new PhotoError("That file is empty.");
  if (input.byteLength > PHOTO_MAX_BYTES) throw new PhotoError("Photos can be up to 25 MB.");

  const kind = sniffImage(input);
  if (!kind) throw new PhotoError("Choose a JPEG, PNG, WebP or HEIC photo.");

  const source = kind === "heic" ? await heicToJpeg(input) : input;
  const open = () => sharp(source, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();

  let width: number;
  let height: number;
  try {
    const meta = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!meta.width || !meta.height) throw new Error("no size");
    if ((meta.pages ?? 1) > 1) throw new PhotoError("Animated images aren’t supported.");
    // EXIF orientations 5–8 swap width and height.
    const swap = (meta.orientation ?? 1) >= 5;
    width = swap ? meta.height : meta.width;
    height = swap ? meta.width : meta.height;
  } catch (err) {
    if (err instanceof PhotoError) throw err;
    throw new PhotoError("That file isn’t an image we can read.");
  }

  const variants = {} as ProcessedPhoto["variants"];
  try {
    for (const size of PHOTO_SIZES) {
      const resized = () => open().resize(size, size, { fit: "inside", withoutEnlargement: true });
      const [webp, jpeg] = await Promise.all([
        resized()
          .webp({ quality: size <= 400 ? 78 : 84 })
          .toBuffer(),
        // JPEG has no alpha: flatten transparent PNG/WebP onto white.
        resized()
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: size <= 400 ? 80 : 85, mozjpeg: true })
          .toBuffer(),
      ]);
      variants[size] = { webp, jpeg };
    }
  } catch {
    throw new PhotoError("That photo couldn’t be processed.");
  }
  return { kind, width, height, variants };
}
