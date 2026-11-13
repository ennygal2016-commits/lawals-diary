import { describe, expect, it } from "vitest";

import { UPLOAD_BUDGET_BYTES, fitWithin, formatBytes, isImageFile, jpegName } from "@/lib/images/shrink";

describe("browser upload shrink helpers", () => {
  it("fits the longest side within 2400 px, never enlarging", () => {
    expect(fitWithin(6000, 4000)).toEqual({ width: 2400, height: 1600 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1800, height: 2400 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(5000, 1, 2400)).toEqual({ width: 2400, height: 1 });
  });

  it("renames to .jpg", () => {
    expect(jpegName("IMG_1234.HEIC")).toBe("IMG_1234.jpg");
    expect(jpegName("holiday.photo.png")).toBe("holiday.photo.jpg");
    expect(jpegName("noext")).toBe("noext.jpg");
    expect(jpegName(".heic")).toBe("photo.jpg");
  });

  it("recognises images by type or extension", () => {
    expect(isImageFile(new File([], "a.heic"))).toBe(true);
    expect(isImageFile(new File([], "x", { type: "image/webp" }))).toBe(true);
    expect(isImageFile(new File([], "doc.pdf", { type: "application/pdf" }))).toBe(false);
  });

  it("keeps each request under Vercel's 4.5 MB body limit", () => {
    expect(UPLOAD_BUDGET_BYTES).toBeLessThan(4.5 * 1000 * 1000);
    expect(formatBytes(UPLOAD_BUDGET_BYTES)).toBe("4.0 MB");
    expect(formatBytes(1500)).toBe("2 KB");
  });
});
