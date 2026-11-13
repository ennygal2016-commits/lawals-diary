import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

import { carriesMetadata } from "../metadata";
import { MISSING_ENV, testPartners } from "./helpers";

// The whole foundation flow against the dev project: a real public submission (signed out) with a GPS-tagged
// photo, then the admin list, detail, status changes, a note and a payment with receipt. Desktop only.
// Needs Turnstile keys in .env.local — Cloudflare's always-pass TEST keys are fine (docs/SETUP.md).
test.skip(!testPartners() || !process.env.SUPABASE_SERVICE_ROLE_KEY, MISSING_ENV);
test.skip(({ isMobile }) => isMobile, "desktop only — writes shared data");
test.describe.configure({ mode: "serial" });

const marker = `E2E Applicant ${Date.now().toString(36)}`;
const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
let reference = "";
let appId = "";

test.afterAll(async () => {
  if (!appId) return;
  const { data: docs } = await db()
    .from("application_documents")
    .select("storage_path")
    .eq("application_id", appId);
  const { data: app } = await db()
    .from("foundation_applications")
    .select("receipt_path")
    .eq("id", appId)
    .maybeSingle();
  const paths = [
    ...(docs ?? []).map((d) => d.storage_path),
    ...(app?.receipt_path ? [app.receipt_path] : []),
  ];
  if (paths.length) await db().storage.from("foundation-docs").remove(paths);
  await db().from("notifications").delete().eq("type", "application").eq("payload->>application_id", appId);
  await db().from("foundation_applications").delete().eq("id", appId);
});

test("an applicant submits the public form and gets a reference", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/foundation");
  const applicant = page.getByRole("group", { name: "About the applicant" });
  await applicant.getByLabel("Full name").fill(marker);
  await page.getByLabel("Date of birth").fill("2012-04-10");
  await page
    .getByRole("group", { name: "Parent or guardian" })
    .getByLabel("Full name")
    .fill("Guardian Person");
  await page
    .getByRole("group", { name: "Parent or guardian" })
    .getByLabel("Email")
    .fill("guardian@example.com");
  await page.getByLabel("School name").fill("Kings College");
  await page.getByLabel("Level").selectOption("secondary");
  await page.getByLabel("Class or year").fill("JSS2");
  await page.getByLabel("Amount requested (CAD)").fill("480");
  await page.getByLabel("Why are you applying?").fill("School fees for the next term; my father is unwell.");
  await page.getByTestId("documents-file").setInputFiles([
    { name: "report.jpg", mimeType: "image/jpeg", buffer: readFileSync("tests/fixtures/gps-exif.jpg") },
    { name: "fees.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\n%%EOF") },
  ]);
  await page.getByLabel(/may be used to assess it/).check();
  await page.getByLabel(/You may contact me/).check();
  // Turnstile (test keys pass automatically).
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Submit application" }).click();

  await expect(page).toHaveURL(/\/foundation\/thanks\?ref=FDN-\d{4}-\d{4,}$/, { timeout: 30_000 });
  reference = (await page.getByTestId("reference").innerText()).trim();
  expect(reference).toMatch(/^FDN-\d{4}-\d{4,}$/);
  await context.close();

  const { data } = await db()
    .from("foundation_applications")
    .select("id, status")
    .eq("reference", reference)
    .single();
  appId = data!.id;
  expect(data!.status).toBe("new");

  // Documents: stored privately, photo stripped of metadata, PDF kept.
  const { data: docs } = await db()
    .from("application_documents")
    .select("storage_path, mime")
    .eq("application_id", appId);
  expect(docs!.map((d) => d.mime).sort()).toEqual(["application/pdf", "image/jpeg"]);
  const photo = docs!.find((d) => d.mime === "image/jpeg")!;
  const { data: blob } = await db().storage.from("foundation-docs").download(photo.storage_path);
  const bytes = Buffer.from(await blob!.arrayBuffer());
  expect((await sharp(bytes).metadata()).exif).toBeUndefined();
  expect(carriesMetadata(bytes)).toBe(false);

  // Both admins notified; the submission is in the history.
  const { data: notes } = await db()
    .from("notifications")
    .select("user_id")
    .eq("payload->>application_id", appId);
  expect(notes).toHaveLength(2);
  const { data: events } = await db()
    .from("application_events")
    .select("to_status, note")
    .eq("application_id", appId);
  expect(events).toEqual([{ to_status: "new", note: "Submitted through the public form" }]);
});

test("admins find it by search; chips count it", async ({ page }) => {
  await page.goto(`/admin/foundation?q=${encodeURIComponent(reference)}`);
  await expect(page.getByRole("list", { name: "Applications" }).getByText(marker)).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Status" }).getByRole("link", { name: "New (1)" }),
  ).toBeVisible();
});

test("detail: status change logged, note, payment with receipt", async ({ page }) => {
  await page.goto(`/admin/foundation/${appId}`);
  await expect(page.locator("h1")).toHaveText(marker);
  await expect(page.getByRole("img", { name: /preview/ })).toBeVisible();

  await page.getByRole("combobox", { name: "Status" }).selectOption("reviewing");
  await page.getByLabel("Why (optional)").fill("Checking with the school");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByRole("list", { name: "History" }).getByText("New → Reviewing")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "History" }).getByText("Checking with the school"),
  ).toBeVisible();

  await page.getByLabel("Add a private note").fill("Fees confirmed by phone.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(
    page.getByRole("list", { name: "History" }).getByText("Fees confirmed by phone."),
  ).toBeVisible();

  await page.getByRole("combobox", { name: "Status" }).selectOption("funded");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Payment" })).toBeVisible();
  await page.getByLabel("Amount paid (CAD)").fill("480");
  await page.getByLabel("Date paid").fill("2026-11-01");
  await page.getByLabel("Receipt").setInputFiles({
    name: "receipt.jpg",
    mimeType: "image/jpeg",
    buffer: readFileSync("tests/fixtures/gps-exif.jpg"),
  });
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Payment recorded.").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Receipt" })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "History" }).getByText(/Payment recorded: CA\$480\.00 on 2026-11-01/),
  ).toBeVisible();

  const { data: events } = await db()
    .from("application_events")
    .select("actor_id, to_status")
    .eq("application_id", appId)
    .not("to_status", "is", null);
  expect(events!.filter((e) => e.actor_id !== null)).toHaveLength(2); // both status changes record who
});

test("applicants and visitors can never read applications", async () => {
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await anon.from("foundation_applications").select("id").eq("id", appId);
  expect(data ?? []).toHaveLength(0);
  const { data: file } = await anon.storage.from("foundation-docs").list(`applications/${appId}`);
  expect(file ?? []).toHaveLength(0);
});
