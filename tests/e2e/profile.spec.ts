import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { MISSING_ENV, testPartners } from "./helpers";

// Runs signed in as partner A. Desktop only: both projects share partner A's profile, so running this twice in
// parallel would race.
test.skip(({ isMobile }) => isMobile, "desktop only — edits shared profile data");
test.skip(!testPartners() || !process.env.SUPABASE_SERVICE_ROLE_KEY, MISSING_ENV);
test.describe.configure({ mode: "serial" });

function service() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("Settings › Profile saves display name, nickname and time zone", async ({ page }) => {
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { level: 2, name: "Profile" })).toBeVisible();

  const nickname = page.getByLabel("Nickname");
  const original = await nickname.inputValue();

  await nickname.fill("");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Enter a nickname.")).toBeVisible();

  await nickname.fill(`${original}-test`);
  await page.getByLabel("Time zone").click();
  await page.getByRole("option", { name: "Africa / Lagos" }).click();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.").first()).toBeVisible();

  await page.reload();
  await expect(nickname).toHaveValue(`${original}-test`);
  await expect(page.getByLabel("Time zone")).toContainText("Africa / Lagos");

  // Put it back.
  await nickname.fill(original);
  await page.getByLabel("Time zone").click();
  await page.getByRole("option", { name: "America / Toronto" }).click();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.").first()).toBeVisible();
});

test("avatar upload is cropped square and stored without metadata", async ({ page }) => {
  // A landscape JPEG carrying EXIF (camera + a location note) — none of it may survive.
  const upload = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#b9a6ff" } })
    .jpeg()
    .withExif({ IFD0: { Make: "TestCam", Model: "Phone 1", ImageDescription: "43.6532N 79.3832W" } })
    .toBuffer();
  expect((await sharp(upload).metadata()).exif).toBeDefined();

  await page.goto("/admin/settings");
  await page
    .getByTestId("avatar-file")
    .setInputFiles({ name: "me.jpg", mimeType: "image/jpeg", buffer: upload });
  const dialog = page.getByRole("dialog", { name: "Crop your photo" });
  await expect(dialog).toBeVisible();

  // Keyboard: zoom in and move.
  await dialog.getByRole("group", { name: "Crop area" }).focus();
  await page.keyboard.press("+");
  await page.keyboard.press("ArrowLeft");
  await dialog.getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByText("Photo updated.").first()).toBeVisible();
  await expect(dialog).toBeHidden();

  // What is in storage: a 512×512 WebP with no EXIF, XMP or IPTC.
  const db = service();
  const email = testPartners()![0]!.email.toLowerCase();
  const { data: users } = await db.auth.admin.listUsers();
  const userId = users.users.find((u) => u.email?.toLowerCase() === email)!.id;
  const { data: profile } = await db.from("profiles").select("avatar_path").eq("user_id", userId).single();
  expect(profile?.avatar_path).toMatch(new RegExp(`^avatars/${userId}/[0-9a-f-]+\\.webp$`));

  const { data: blob, error } = await db.storage.from("photos-private").download(profile!.avatar_path!);
  expect(error).toBeNull();
  const meta = await sharp(Buffer.from(await blob!.arrayBuffer())).metadata();
  expect(meta.format).toBe("webp");
  expect([meta.width, meta.height]).toEqual([512, 512]);
  expect(meta.exif).toBeUndefined();
  expect(meta.xmp).toBeUndefined();
  expect(meta.iptc).toBeUndefined();

  // The header avatar now shows the photo.
  await expect(
    page.getByRole("button", { name: "Account and sign out" }).first().locator("img"),
  ).toBeVisible();

  // Clean up.
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Photo removed.").first()).toBeVisible();
  const { data: after } = await db.storage.from("photos-private").list(`avatars/${userId}`);
  expect(after ?? []).toHaveLength(0);
});
