import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { PHOTO_FORMATS, PHOTO_SIZES, PhotoError, processPhoto } from "@/lib/images/photo";
import { sniffImage } from "@/lib/images/sniff";
import { allVariantPaths, parseVariants, variantPath } from "@/lib/images/variants";
import { PHOTO_FILTERS, photoFilterSchema, updatePhotoSchema } from "@/lib/validation/photo";
import { carriesMetadata, exifHasGps } from "../metadata";

const GPS_FIXTURE = readFileSync("tests/fixtures/gps-exif.jpg");

describe("the GPS fixture really has GPS", () => {
  it("carries EXIF with a GPS IFD, camera make and orientation 6", async () => {
    const meta = await sharp(GPS_FIXTURE).metadata();
    expect(meta.orientation).toBe(6);
    expect(meta.exif).toBeDefined();
    expect(meta.exif!.includes(Buffer.from("FixtureCam"))).toBe(true);
    expect(exifHasGps(meta.exif!)).toBe(true);
    expect(carriesMetadata(GPS_FIXTURE)).toBe(true);
  });
});

describe("processPhoto (PRD FR-24)", () => {
  it("makes 400, 1200 and 2400 px as WebP and JPEG — and no variant keeps any metadata", async () => {
    const out = await processPhoto(GPS_FIXTURE);
    expect(out.kind).toBe("jpeg");
    // Orientation 6 on a 1600×1200 file → shown as 1200×1600.
    expect([out.width, out.height]).toEqual([1200, 1600]);

    for (const size of PHOTO_SIZES) {
      for (const format of PHOTO_FORMATS) {
        const buf = out.variants[size][format];
        const meta = await sharp(buf).metadata();
        expect(meta.format).toBe(format);
        expect(Math.max(meta.width!, meta.height!)).toBe(Math.min(size, 1600));
        expect(meta.height! > meta.width!).toBe(true); // rotated into the pixels
        expect(meta.exif, `${size} ${format} exif`).toBeUndefined();
        expect(meta.xmp).toBeUndefined();
        expect(meta.iptc).toBeUndefined();
        expect(meta.icc).toBeUndefined();
        expect(meta.orientation).toBeUndefined();
        expect(carriesMetadata(buf), `${size} ${format} bytes`).toBe(false);
        expect(buf.includes(Buffer.from("FixtureCam"))).toBe(false);
      }
    }
  });

  it("never upscales a small photo", async () => {
    const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#000" } })
      .png()
      .toBuffer();
    const out = await processPhoto(small);
    expect((await sharp(out.variants[2400].webp).metadata()).width).toBe(300);
    expect((await sharp(out.variants[400].jpeg).metadata()).width).toBe(300);
  });

  it("flattens transparency onto white for the JPEG fallback", async () => {
    const clear = await sharp({
      create: { width: 20, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const out = await processPhoto(clear);
    const { channels } = await sharp(out.variants[400].jpeg).stats();
    expect(channels[0]!.mean).toBeGreaterThan(250);
  });

  it("trusts the bytes, not the name: rejects non-images, GIF, AVIF and empty files", async () => {
    await expect(processPhoto(Buffer.from("%PDF-1.7 hello"))).rejects.toThrow(PhotoError);
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } })
      .gif()
      .toBuffer();
    await expect(processPhoto(gif)).rejects.toThrow(/JPEG, PNG, WebP or HEIC/);
    const avif = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#000" } })
      .avif()
      .toBuffer();
    await expect(processPhoto(avif)).rejects.toThrow(/JPEG, PNG, WebP or HEIC/);
    await expect(processPhoto(Buffer.alloc(0))).rejects.toThrow(/empty/);
  });

  it("sends HEIC through the converter (a broken HEIC fails cleanly)", async () => {
    const fakeHeic = Buffer.concat([
      Buffer.from([0, 0, 0, 0x18]),
      Buffer.from("ftypheic"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("mif1heic"),
      Buffer.alloc(64),
    ]);
    expect(sniffImage(fakeHeic)).toBe("heic");
    await expect(processPhoto(fakeHeic)).rejects.toThrow(/HEIC photo couldn’t be read/);
  });
});

describe("sniffImage", () => {
  it("recognises the four accepted types from their magic bytes", async () => {
    const make = (fmt: "jpeg" | "png" | "webp") =>
      sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } })
        [fmt]()
        .toBuffer();
    expect(sniffImage(await make("jpeg"))).toBe("jpeg");
    expect(sniffImage(await make("png"))).toBe("png");
    expect(sniffImage(await make("webp"))).toBe("webp");
    const heif = (major: string, compat: string[]) =>
      Buffer.concat([
        Buffer.from([0, 0, 0, 16 + compat.length * 4]),
        Buffer.from(`ftyp${major}`),
        Buffer.from([0, 0, 0, 0]),
        ...compat.map((c) => Buffer.from(c)),
      ]);
    expect(sniffImage(heif("heic", ["mif1", "heic"]))).toBe("heic");
    expect(sniffImage(heif("mif1", ["heic"]))).toBe("heic");
    expect(sniffImage(heif("avif", ["mif1", "avif"]))).toBeNull();
    expect(sniffImage(Buffer.from("GIF89a......"))).toBeNull();
    expect(sniffImage(Buffer.from("tiny"))).toBeNull();
  });
});

describe("variant paths", () => {
  const set = parseVariants({
    "400": { webp: "a/400.webp", jpeg: "a/400.jpg" },
    "1200": { webp: "a/1200.webp", jpeg: "a/1200.jpg" },
    "2400": { webp: "a/2400.webp", jpeg: "a/2400.jpg" },
  });

  it("lists all six paths and picks the right one", () => {
    expect(allVariantPaths(set)).toHaveLength(6);
    expect(variantPath(set, "1200", "jpeg")).toBe("a/1200.jpg");
  });

  it("falls back to the nearest size and reads Phase 5 stub rows", () => {
    const legacy = parseVariants({ "400": "s/400.webp", "2400": "s/2400.webp" });
    expect(variantPath(legacy, "1200", "webp")).toBe("s/2400.webp");
    expect(variantPath(legacy, "400", "jpeg")).toBeUndefined();
    expect(parseVariants(null)).toEqual({});
    expect(parseVariants({ "400": { webp: 7 } })).toEqual({});
  });
});

describe("photo validation", () => {
  it("knows the five filters", () => {
    expect(PHOTO_FILTERS.map((f) => f.label)).toEqual([
      "All",
      "In gallery",
      "On About page",
      "In public entries",
      "Private",
    ]);
    expect(photoFilterSchema.safeParse("private").success).toBe(true);
    expect(photoFilterSchema.safeParse("drop table").success).toBe(false);
  });

  it("updatePhoto needs an id and at least one change; caption ≤ 500", () => {
    const id = "3f0c2b9e-4b7a-4c1e-9a55-0d6f1b2c3d4e";
    expect(updatePhotoSchema.safeParse({ id }).success).toBe(false);
    expect(updatePhotoSchema.safeParse({ id, in_gallery: true }).success).toBe(true);
    expect(updatePhotoSchema.safeParse({ id, caption: "x".repeat(501) }).success).toBe(false);
    expect(updatePhotoSchema.safeParse({ id: "nope", on_about: true }).success).toBe(false);
  });
});
