import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { AVATAR_OUTPUT_SIZE, AvatarError, processAvatar } from "@/lib/images/avatar";

async function jpegWithExif(width: number, height: number, orientation?: number) {
  let img = sharp({ create: { width, height, channels: 3, background: "#ff8a9b" } }).jpeg();
  img = img.withExif({ IFD0: { Make: "TestCam", Model: "Phone 1", ImageDescription: "43.6532N 79.3832W" } });
  if (orientation) img = img.withMetadata({ orientation });
  return img.toBuffer();
}

describe("processAvatar", () => {
  it("outputs a 512² WebP with no EXIF, XMP, IPTC or ICC", async () => {
    const input = await jpegWithExif(1200, 800);
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const out = await processAvatar(input, { x: 200, y: 0, size: 800 });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE]);
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.iptc).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it("applies EXIF orientation before cropping (crop coordinates are what the browser shows)", async () => {
    // Stored 300×200 landscape, orientation 6 → displayed as 200×300 portrait. A crop at y=100 with size 200 is
    // only valid in the rotated space; it must not be clamped away.
    const left = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#000000" } })
      .composite([
        {
          input: await sharp({ create: { width: 150, height: 200, channels: 3, background: "#ffffff" } })
            .png()
            .toBuffer(),
          left: 150,
          top: 0,
        },
      ])
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    // Rotated 90° clockwise: the white right half becomes the bottom half.
    const bottom = await processAvatar(left, { x: 0, y: 100, size: 200 });
    const top = await processAvatar(left, { x: 0, y: 0, size: 200 });
    const mean = async (buf: Buffer) => (await sharp(buf).stats()).channels[0]!.mean;
    expect(await mean(bottom)).toBeGreaterThan(await mean(top));
  });

  it("clamps an out-of-range crop into the image instead of failing", async () => {
    const out = await processAvatar(await jpegWithExif(400, 300), { x: 9_999, y: 9_999, size: 99_999 });
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([512, 512]);
  });

  it("sniffs the real format: rejects non-images and unsupported formats whatever the name says", async () => {
    await expect(
      processAvatar(Buffer.from("%PDF-1.7 not an image"), { x: 0, y: 0, size: 10 }),
    ).rejects.toThrow(AvatarError);
    const gif = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#000" } })
      .gif()
      .toBuffer();
    await expect(processAvatar(gif, { x: 0, y: 0, size: 20 })).rejects.toThrow(/JPEG, PNG or WebP/);
    await expect(processAvatar(Buffer.alloc(0), { x: 0, y: 0, size: 1 })).rejects.toThrow(/empty/);
  });
});
