import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import sharp from "sharp";

import { MISSING_ENV, signIn, testPartners } from "./helpers";

// Signed in as partner A (D_Gal). Desktop only: these write shared data in the dev project.
const partners = testPartners();
test.skip(!partners || !process.env.SUPABASE_SERVICE_ROLE_KEY, MISSING_ENV);
test.skip(({ isMobile }) => isMobile, "desktop only — writes shared data");
test.describe.configure({ mode: "serial" });

const marker = `e2e-entry-${Date.now()}`;

function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

test.afterAll(async () => {
  const db = service();
  const { data } = await db.from("entries").select("id").like("title", `${marker}%`);
  const ids = (data ?? []).map((e) => e.id);
  if (ids.length) {
    const { data: links } = await db.from("entry_photos").select("photo_id").in("entry_id", ids);
    await db.from("entries").delete().in("id", ids);
    await db.from("notifications").delete().like("payload->>title", `${marker}%`);
    const photoIds = (links ?? []).map((l) => l.photo_id);
    if (photoIds.length) {
      // Each size is { webp, jpeg }; public copies (if the entry was public) live in photos-public.
      const { data: photos } = await db.from("photos").select("variants, public_variants").in("id", photoIds);
      const flat = (v: unknown) =>
        Object.values((v ?? {}) as Record<string, Record<string, string>>).flatMap((f) => Object.values(f));
      const priv = (photos ?? []).flatMap((p) => flat(p.variants));
      const pub = (photos ?? []).flatMap((p) => flat(p.public_variants));
      if (priv.length) await db.storage.from("photos-private").remove(priv);
      if (pub.length) await db.storage.from("photos-public").remove(pub);
      await db.from("photos").delete().in("id", photoIds);
    }
  }
});

let entryUrl = "";

test("?date= pre-fills the date; autosave creates a draft within 5 s and lists it in Drafts", async ({
  page,
}) => {
  await page.goto("/admin/entries/new?date=2026-01-15");
  await expect(page.getByLabel("Date")).toHaveValue("2026-01-15");

  await page.getByLabel("Title").fill(`${marker} draft`);
  await expect(page.getByRole("status").filter({ hasText: /^Draft saved · \d\d:\d\d$/ })).toBeVisible({
    timeout: 9_000,
  });
  await expect(page).toHaveURL(/\/admin\/entries\/[0-9a-f-]{36}\/edit$/);

  await page.goto("/admin/drafts");
  await expect(page.getByRole("list", { name: "Drafts" }).getByText(`${marker} draft`)).toBeVisible();
});

test("blur saves straight away", async ({ page }) => {
  await page.goto("/admin/drafts");
  await page.getByRole("link", { name: new RegExp(`${marker} draft`) }).click();
  await page.getByLabel("Location").fill("Union Station");
  await page.getByLabel("Title").focus(); // blur Location
  await expect(page.getByRole("status").filter({ hasText: /^Draft saved/ })).toBeVisible({ timeout: 4_000 });
});

test("full entry: every field, a stripped photo, body, public → read view", async ({ page }) => {
  await page.goto("/admin/drafts");
  await page.getByRole("link", { name: new RegExp(`${marker} draft`) }).click();

  await page.getByLabel("Title").fill(`${marker} lake walk`);
  await page.getByRole("group", { name: "Mood" }).getByRole("button", { name: "Calm" }).click();
  await page.getByRole("group", { name: "Category" }).getByRole("button", { name: "Travel" }).click();

  const jpeg = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#7ec8e0" } })
    .jpeg()
    .withExif({ IFD0: { Make: "TestCam", ImageDescription: "43.6532N 79.3832W" } })
    .toBuffer();
  await page
    .getByTestId("entry-photo-file")
    .setInputFiles({ name: "lake.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await expect(page.getByRole("img", { name: "Photo 1 (cover)" })).toBeVisible({ timeout: 20_000 });

  const editor = page.getByRole("textbox", { name: "What happened?" });
  await editor.click();
  await page.keyboard.type("We walked to the pier.");
  await page.getByRole("button", { name: "Private" }).click();
  await page.getByRole("button", { name: "Save entry" }).click();

  await expect(page).toHaveURL(/\/admin\/entries\/[0-9a-f-]{36}$/);
  entryUrl = page.url();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${marker} lake walk`);
  await expect(page.getByText("We walked to the pier.")).toBeVisible();
  await expect(page.getByText("Union Station")).toBeVisible();
  await expect(page.getByText("Calm")).toBeVisible();
  await expect(page.getByText("Travel")).toBeVisible();
  await expect(page.getByText("Public", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Cover photo" })).toBeVisible();

  // Stored: published, body_text for search, slug, photo without metadata.
  const db = service();
  const id = entryUrl.split("/").pop()!;
  const { data: row } = await db
    .from("entries")
    .select("status, body_text, slug, visibility, cover_photo_id")
    .eq("id", id)
    .single();
  expect(row).toMatchObject({
    status: "published",
    body_text: "We walked to the pier.",
    visibility: "public",
  });
  expect(row!.slug).toMatch(/-lake-walk-[0-9a-f]{6}$/);
  const { data: photo } = await db.from("photos").select("variants").eq("id", row!.cover_photo_id!).single();
  // Each size is stored as { webp, jpeg }.
  const path = (photo!.variants as Record<string, { webp: string }>)["2400"]!.webp;
  const { data: blob } = await db.storage.from("photos-private").download(path);
  const meta = await sharp(Buffer.from(await blob!.arrayBuffer())).metadata();
  expect(meta.exif).toBeUndefined();

  // Published entries no longer appear in Drafts.
  await page.goto("/admin/drafts");
  await expect(page.getByText(`${marker} lake walk`)).toHaveCount(0);
});

test("comments: add and delete your own; the partner can't delete it", async ({ page, browser }) => {
  await page.goto(entryUrl);
  await page.getByLabel("Add a comment").fill("Best day this month.");
  await page.getByRole("button", { name: "Post comment" }).click();
  const comments = page.getByRole("region", { name: /Comments/ });
  await expect(comments.getByText("Best day this month.")).toBeVisible();

  await asPartnerB(browser, async (p) => {
    await p.goto(entryUrl);
    const theirs = p.getByRole("region", { name: /Comments/ });
    await expect(theirs.getByText("Best day this month.")).toBeVisible();
    await expect(theirs.getByRole("button", { name: /Delete your comment/ })).toHaveCount(0);
    // Not the author: no Edit / Delete, and the edit URL bounces back.
    await expect(p.getByRole("link", { name: "Edit" })).toHaveCount(0);
    await p.goto(`${entryUrl}/edit`);
    await expect(p).toHaveURL(entryUrl);
  });

  await comments.getByRole("button", { name: /Delete your comment/ }).click();
  await expect(comments.getByText("Best day this month.")).toHaveCount(0);
});

test("edit a published entry: no autosave, Save entry updates it", async ({ page }) => {
  await page.goto(`${entryUrl}/edit`);
  await expect(page.getByRole("status")).toHaveText("Editing a published entry");
  await page.getByLabel("Title").fill(`${marker} lake walk, again`);
  await expect(page.getByRole("status")).toHaveText("Unsaved changes — press Save entry");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${marker} lake walk, again`);
});

test("soft delete, then restore", async ({ page }) => {
  await page.goto(entryUrl);
  await page.getByRole("button", { name: "Delete" }).click();
  await page
    .getByRole("dialog", { name: "Delete this entry?" })
    .getByRole("button", { name: "Delete entry" })
    .click();
  await expect(page.getByText(/Deleted\. You can restore it until/)).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByText(`${marker} lake walk, again`)).toHaveCount(0);

  await page.goto("/admin/drafts");
  const deleted = page.getByRole("region", { name: "Recently deleted" });
  await expect(deleted.getByText(`${marker} lake walk, again`)).toBeVisible();
  await deleted.getByRole("button", { name: "Restore" }).first().click();
  await expect(page.getByText("Entry restored.").first()).toBeVisible();

  await page.goto(entryUrl);
  await expect(page.getByText(/Deleted\./)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
});

async function asPartnerB<T>(browser: Browser, run: (page: Page) => Promise<T>) {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  try {
    const b = partners![1]!;
    await page.goto("/login");
    await signIn(page, b.email, b.password);
    await expect(page).toHaveURL(/\/admin$/);
    return await run(page);
  } finally {
    await context.close();
  }
}
