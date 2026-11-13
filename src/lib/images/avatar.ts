import sharp, { type Metadata } from "sharp";

/** Uploaded avatar limits. HEIC is converted in the Phase 6 photo pipeline; avatars take JPEG, PNG or WebP. */
export const AVATAR_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_ACCEPT = ["image/jpeg", "image/png", "image/webp"] as const;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_INPUT_PIXELS = 50_000_000;

export type SquareCrop = { x: number; y: number; size: number };

export class AvatarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarError";
  }
}

/**
 * Sniff the real format from the bytes, apply EXIF orientation to the pixels, cut the square the user chose
 * (in oriented pixel coordinates — what the browser shows), resize to 512², and encode WebP.
 * sharp drops ALL metadata (EXIF incl. GPS, XMP, IPTC, ICC comments) unless asked to keep it; we never ask.
 */
export async function processAvatar(input: Buffer, crop: SquareCrop): Promise<Buffer> {
  if (input.byteLength === 0) throw new AvatarError("That file is empty.");
  if (input.byteLength > AVATAR_MAX_BYTES) throw new AvatarError("Choose an image under 10 MB.");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new AvatarError("That file isn’t an image we can read. Choose a JPEG, PNG or WebP.");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    throw new AvatarError("Choose a JPEG, PNG or WebP image.");
  }

  // Orientation first, so the crop matches what the person saw.
  const { data: oriented, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .toBuffer({ resolveWithObject: true });

  const side = Math.min(info.width, info.height);
  const size = clamp(Math.round(crop.size), Math.min(16, side), side);
  const left = clamp(Math.round(crop.x), 0, info.width - size);
  const top = clamp(Math.round(crop.y), 0, info.height - size);

  return sharp(oriented)
    .extract({ left, top, width: size, height: size })
    .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, { fit: "cover" })
    .webp({ quality: 85 })
    .toBuffer();
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
