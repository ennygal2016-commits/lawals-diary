/**
 * Browser-side resize before upload (CLAUDE.md decision 2026-11-12). Vercel rejects request bodies over 4.5 MB,
 * so photos are re-drawn to at most 2400 px — the largest size we ever store — and re-encoded as JPEG. Re-drawing
 * on a canvas also drops EXIF/GPS; the server still strips metadata from whatever arrives (DESIGN.md §8).
 *
 * Client-only: uses createImageBitmap and <canvas>.
 */

/** The most one request may carry (headroom under Vercel's 4.5 MB for the multipart envelope + fields). */
export const UPLOAD_BUDGET_BYTES = 4 * 1024 * 1024;
export const UPLOAD_BUDGET_LABEL = "4 MB";
export const STORED_MAX_SIDE = 2400;

const IMAGE_TYPE = /^image\/(jpeg|png|webp|heic|heif)$/;
const IMAGE_NAME = /\.(jpe?g|png|webp|heic|heif)$/i;

export function isImageFile(file: File) {
  return IMAGE_TYPE.test(file.type) || IMAGE_NAME.test(file.name);
}

/** Pure: the target size for an image so its longest side is ≤ maxSide. */
export function fitWithin(width: number, height: number, maxSide = STORED_MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Pure: "IMG_1234.HEIC" → "IMG_1234.jpg". */
export function jpegName(name: string) {
  const base = name.replace(/\.[^./\\]+$/, "") || "photo";
  return `${base}.jpg`;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function encodeWithinBudget(canvas: HTMLCanvasElement, budget: number): Promise<Blob | null> {
  for (const q of [0.9, 0.82, 0.72, 0.6]) {
    const blob = await canvasToJpeg(canvas, q);
    if (!blob) return null;
    if (blob.size <= budget) return blob;
  }
  return null;
}

function drawOnCanvas(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff"; // transparent PNGs → white, not black
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * Returns a JPEG of at most 2400 px that fits the upload budget. If the browser can't decode the file (e.g. HEIC
 * outside Safari) the original is returned unchanged — the server converts it, as long as it fits the budget.
 * Files that are already small enough and not too large in pixels are sent as they are (no second compression).
 */
export async function shrinkImage(file: File, budget = UPLOAD_BUDGET_BYTES): Promise<File> {
  if (!isImageFile(file) || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const target = fitWithin(bitmap.width, bitmap.height);
    const alreadyFine =
      file.size <= budget &&
      target.width === bitmap.width &&
      target.height === bitmap.height &&
      /^image\/(jpeg|png|webp)$/.test(file.type);
    if (alreadyFine) return file;
    const canvas = drawOnCanvas(bitmap, target.width, target.height);
    if (!canvas) return file;
    const blob = await encodeWithinBudget(canvas, budget);
    if (!blob) return file;
    return new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

/**
 * Avatar: crops the chosen square on the client and returns a ≤ 1024 px JPEG, so the server gets a small square
 * (its crop is then simply the whole image).
 */
export async function cropSquare(
  imageUrl: string,
  crop: { x: number; y: number; size: number },
  name: string,
  out = 1024,
): Promise<File | null> {
  const img = new Image();
  img.src = imageUrl;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const side = Math.min(out, crop.size);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, side, side);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, side, side);
  const blob = await encodeWithinBudget(canvas, UPLOAD_BUDGET_BYTES);
  return blob ? new File([blob], jpegName(name), { type: "image/jpeg" }) : null;
}

/** Pure: human-readable size for messages. */
export function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}
