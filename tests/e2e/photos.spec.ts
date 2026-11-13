import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { carriesMetadata, exifHasGps } from "../metadata";
import { MISSING_ENV, testPartners } from "./helpers";

// Signed in as partner A. Desktop only — writes to the dev project's storage.
test.skip(!testPartners() || !process.env.SUPABASE_SERVICE_ROLE_KEY, MISSING_ENV);
test.skip(({ isMobile }) => isMobile, "desktop only — writes shared data");
test.describe.configure({ mode: "serial" });

const GPS_FIXTURE = readFileSync("tests/fixtures/gps-exif.jpg");
type Variants = Record<string, Record<string, string>>;

function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

const created: string[] = [];

test.afterAll(async () => {
  const db = service();
  for (const id of created) {
    const { data } = await db.from("photos").select("variants, public_variants").eq("id", id).maybeSingle();
    if (!data) continue;
    const paths = (v: unknown) => Object.values((v ?? {}) as Variants).flatMap((f) => Object.values(f));
    await db.storage.from("photos-private").remove(paths(data.variants));
    await db.storage.from("photos-public").remove(paths(data.public_variants));
    await db.from("photos").delete().eq("id", id);
  }
});

test("uploading a photo with GPS EXIF: no EXIF survives in any of the six stored variants", async ({
  page,
}) => {
  // The fixture really carries GPS before upload.
  const before = await sharp(GPS_FIXTURE).metadata();
  expect(exifHasGps(before.exif!)).toBe(true);

  await page.goto("/admin/photos");
  const response = await page.request.post("/api/photos/upload", {
    headers: { origin: new URL(page.url()).origin },
    multipart: { photos: { name: "gps-exif.jpg", mimeType: "image/jpeg", buffer: GPS_FIXTURE } },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { photos: Array<{ id: string; width: number; height: number }> };
  expect(body.photos).toHaveLength(1);
  const { id, width, height } = body.photos[0]!;
  created.push(id);
  expect([width, height]).toEqual([1200, 1600]); // orientation applied

  const db = service();
  const { data: row } = await db.from("photos").select("variants, public_variants").eq("id", id).single();
  expect(row!.public_variants).toBeNull(); // new photos are private
  const variants = row!.variants as Variants;
  const stored = Object.entries(variants).flatMap(([size, formats]) =>
    Object.entries(formats).map(([format, path]) => ({ size, format, path })),
  );
  expect(stored.map((s) => `${s.size}.${s.format}`).sort()).toEqual(
    ["1200.jpeg", "1200.webp", "2400.jpeg", "2400.webp", "400.jpeg", "400.webp"].sort(),
  );

  for (const { size, format, path } of stored) {
    const { data: blob, error } = await db.storage.from("photos-private").download(path);
    expect(error, path).toBeNull();
    const bytes = Buffer.from(await blob!.arrayBuffer());
    const meta = await sharp(bytes).metadata();
    expect(meta.format, path).toBe(format);
    expect(meta.exif, `${size} ${format}: EXIF`).toBeUndefined();
    expect(meta.xmp, `${size} ${format}: XMP`).toBeUndefined();
    expect(carriesMetadata(bytes), `${size} ${format}: raw bytes`).toBe(false);
    expect(bytes.includes(Buffer.from("FixtureCam")), `${size} ${format}: camera make`).toBe(false);
  }

  // Signed-out visitors can't fetch the private files.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: leaked } = await anon.storage.from("photos-private").download(stored[0]!.path);
  expect(leaked).toBeNull();
});

test("the upload route sniffs the bytes and refuses non-images and other sites", async ({ page }) => {
  await page.goto("/admin/photos");
  const origin = new URL(page.url()).origin;
  const fake = await page.request.post("/api/photos/upload", {
    headers: { origin },
    multipart: {
      photos: { name: "holiday.jpg", mimeType: "image/jpeg", buffer: Buffer.from("%PDF-1.7 not a photo") },
    },
  });
  expect(fake.status()).toBe(422);
  expect((await fake.json()).errors[0].message).toMatch(/JPEG, PNG, WebP or HEIC/);

  const crossSite = await page.request.post("/api/photos/upload", {
    headers: { origin: "https://evil.example" },
    multipart: { photos: { name: "a.jpg", mimeType: "image/jpeg", buffer: GPS_FIXTURE } },
  });
  expect(crossSite.status()).toBe(403);
});

test("upload through the page, then the gallery toggle creates and removes public copies", async ({
  page,
}) => {
  await page.goto("/admin/photos");
  await page
    .getByTestId("photos-file")
    .setInputFiles({ name: "lake.jpg", mimeType: "image/jpeg", buffer: GPS_FIXTURE });
  const queue = page.getByRole("region", { name: "Uploads" });
  await expect(queue.getByText("Done")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /^Open photo 1[ :]/ }).click();
  const dialog = page.getByRole("dialog", { name: /^Photo 1 of/ });
  await expect(dialog.getByText("Private", { exact: true })).toBeVisible();

  const db = service();
  const { data: newest } = await db
    .from("photos")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const id = newest!.id;
  created.push(id);

  await dialog.getByRole("switch", { name: "Show in public gallery" }).click();
  await expect(page.getByText("Added to the public gallery.").first()).toBeVisible();
  await expect(dialog.getByText("Public", { exact: true })).toBeVisible();

  const { data: pub } = await db.from("photos").select("public_variants").eq("id", id).single();
  const copies = pub!.public_variants as Variants;
  expect(Object.keys(copies).sort()).toEqual(["1200", "2400", "400"]);
  const publicUrl = db.storage.from("photos-public").getPublicUrl(copies["400"]!.webp!).data.publicUrl;
  const res = await fetch(publicUrl);
  expect(res.ok).toBe(true);
  expect(carriesMetadata(Buffer.from(await res.arrayBuffer()))).toBe(false);

  // The public view shows the copy, never the private path.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: viewRow } = await anon.from("public_photos").select("variants").eq("id", id).maybeSingle();
  if (viewRow) expect(JSON.stringify(viewRow.variants)).not.toContain("photos/");

  await dialog.getByRole("switch", { name: "Show in public gallery" }).click();
  await expect(page.getByText("Removed from the public gallery.").first()).toBeVisible();
  const { data: after } = await db.from("photos").select("public_variants").eq("id", id).single();
  expect(after!.public_variants).toBeNull();
  expect((await fetch(publicUrl, { cache: "no-store" })).ok).toBe(false);

  // Delete removes the row and the private files.
  const { data: row } = await db.from("photos").select("variants").eq("id", id).single();
  const firstPath = Object.values(row!.variants as Variants)[0]!.webp!;
  await dialog.getByRole("button", { name: "Delete photo" }).click();
  await page
    .getByRole("dialog", { name: "Delete this photo?" })
    .getByRole("button", { name: "Delete photo" })
    .click();
  await expect(page.getByText("Photo deleted.").first()).toBeVisible();
  expect((await db.from("photos").select("id").eq("id", id).maybeSingle()).data).toBeNull();
  expect((await db.storage.from("photos-private").download(firstPath)).data).toBeNull();
});

test("the entry form's Photos field uses the same pipeline and says so", async ({ page }) => {
  await page.goto("/admin/entries/new");
  await expect(page.getByText("Location data is removed on upload")).toBeVisible();
  await page
    .getByTestId("entry-photo-file")
    .setInputFiles({ name: "gps.jpg", mimeType: "image/jpeg", buffer: GPS_FIXTURE });
  await expect(page.getByRole("img", { name: "Photo 1 (cover)" })).toBeVisible({ timeout: 30_000 });
  const db = service();
  const { data: newest } = await db
    .from("photos")
    .select("id, variants")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  created.push(newest!.id);
  expect(Object.keys(newest!.variants as Variants).sort()).toEqual(["1200", "2400", "400"]);
});
