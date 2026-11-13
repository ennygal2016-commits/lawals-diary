import sharp from "sharp";

import { DOC_MAX_BYTES } from "@/lib/validation/foundation";
import { sniffImage } from "./sniff";

export class DocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentError";
  }
}

export type CleanDocument = { buffer: Buffer; mime: "application/pdf" | "image/jpeg"; ext: "pdf" | "jpg" };

const MAX_SIDE = 3000;

/**
 * Supporting documents and receipts (PRD FR-32/35). The type is sniffed from the bytes. PDFs are kept as sent.
 * Photos/scans (JPEG, PNG, WebP, HEIC) are re-encoded as JPEG with the orientation applied and ALL metadata
 * (EXIF incl. GPS) stripped — the same rule as the photo pipeline.
 */
export async function cleanDocument(input: Buffer): Promise<CleanDocument> {
  if (input.byteLength === 0) throw new DocumentError("That file is empty.");
  if (input.byteLength > DOC_MAX_BYTES) throw new DocumentError("Files can be up to 10 MB each.");

  if (input.subarray(0, 5).toString("latin1") === "%PDF-") {
    return { buffer: input, mime: "application/pdf", ext: "pdf" };
  }

  const kind = sniffImage(input);
  if (!kind) throw new DocumentError("Upload a PDF or a photo (JPEG, PNG, WebP or HEIC).");

  let source = input;
  if (kind === "heic") {
    const { default: convert } = await import("heic-convert");
    try {
      source = Buffer.from(await convert({ buffer: new Uint8Array(input), format: "JPEG", quality: 0.92 }));
    } catch {
      throw new DocumentError("That HEIC photo couldn’t be read. Try a JPEG or PDF.");
    }
  }
  try {
    const buffer = await sharp(source, { limitInputPixels: 100_000_000 })
      .rotate()
      .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { buffer, mime: "image/jpeg", ext: "jpg" };
  } catch {
    throw new DocumentError("That image couldn’t be read. Try a JPEG or PDF.");
  }
}
