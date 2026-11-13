import { expect, test, type Page } from "@playwright/test";

// The public /foundation page and /api/foundation/apply, signed out. Without Supabase configured the route stops
// after the rate limit with "can't be received right now" — which still proves the form reaches the server.
test.use({ storageState: { cookies: [], origins: [] } });

async function fillValidAdult(page: Page) {
  await page.getByRole("group", { name: "About the applicant" }).getByLabel("Full name").fill("Tolu Adeyemi");
  await page.getByLabel("Date of birth").fill("2000-05-01");
  await page.getByRole("group", { name: "About the applicant" }).getByLabel("Email").fill("tolu@example.com");
  await page.getByLabel("School name").fill("University of Lagos");
  await page.getByLabel("Level").selectOption("tertiary");
  await page.getByLabel("Class or year").fill("Year 2");
  await page.getByLabel("Amount requested (CAD)").fill("1250");
  await page
    .getByLabel("Why are you applying?")
    .fill("Tuition for the second semester after the shop closed.");
  await page.getByLabel(/may be used to assess it/).check();
  await page.getByLabel(/You may contact me/).check();
}

test.describe("public /foundation", () => {
  test("intro and every form section, one h1, no sideways scroll", async ({ page }) => {
    await page.goto("/foundation");
    await expect(page.locator("h1")).toHaveText("Foundation");
    for (const legend of [
      "About the applicant",
      "Parent or guardian",
      "School",
      "Your request",
      "Supporting documents",
      "Consent",
    ]) {
      await expect(page.getByRole("group", { name: legend })).toBeVisible();
    }
    await expect(page.getByLabel("Level")).toBeVisible();
    await expect(page.getByText("In Canadian dollars.")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
    expect((await page.request.get("/foundation")).headers()["x-robots-tag"]).toBeUndefined(); // public and indexable
  });

  test("an empty submit shows inline errors and focuses the first", async ({ page }) => {
    await page.goto("/foundation");
    await page.getByRole("button", { name: "Submit application" }).click();
    const name = page.getByRole("group", { name: "About the applicant" }).getByLabel("Full name");
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    for (const msg of [
      "Enter the applicant’s full name.",
      "Enter the school’s name.",
      "Choose a level.",
      "Please agree so we can consider the application.",
    ]) {
      await expect(page.getByText(msg)).toBeVisible();
    }
  });

  test("under 18: a parent or guardian is required", async ({ page }) => {
    await page.goto("/foundation");
    await fillValidAdult(page);
    await page.getByLabel("Date of birth").fill("2013-02-10");
    await expect(page.getByText("Required — the applicant is under 18.")).toBeVisible();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByText("Applicants under 18 need a parent or guardian.")).toBeVisible();
    await expect(page.getByText("Give the guardian’s phone or email.")).toBeVisible();
  });

  test("documents: up to five, 4 MB in total, removable", async ({ page }) => {
    await page.goto("/foundation");
    const pdf = (n: number) => ({
      name: `doc-${n}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(`%PDF-1.7 ${n}`),
    });
    await page.getByTestId("documents-file").setInputFiles([1, 2, 3, 4, 5, 6].map(pdf));
    await expect(page.getByText("Up to 5 files.")).toBeVisible();
    const list = page.getByRole("list", { name: "Documents to send" });
    await expect(list.getByRole("listitem")).toHaveCount(5);
    await expect(page.getByRole("button", { name: "Add documents" })).toBeDisabled();
    await list.getByRole("button", { name: "Remove doc-1.pdf" }).click();
    await expect(list.getByRole("listitem")).toHaveCount(4);
    await page.getByTestId("documents-file").setInputFiles({
      name: "huge.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(10 * 1024 * 1024 + 10, 1),
    });
    await expect(page.getByText("“huge.pdf” is over 10 MB.")).toBeVisible();
    // Everything goes in one request, which must stay under the hosting limit.
    await page.getByTestId("documents-file").setInputFiles({
      name: "big.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(4 * 1024 * 1024 + 10, 1),
    });
    await expect(page.getByText("“big.pdf” would take the attachments over 4 MB in total.")).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveCount(4);
  });

  test("a valid form reaches the server (no database here → a clear, polite error)", async ({ page }) => {
    test.skip(
      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      "with Supabase configured, foundation.spec.ts covers the real submit",
    );
    await page.goto("/foundation");
    await fillValidAdult(page);
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Applications can’t be received right now." }),
    ).toBeVisible();
  });

  test("the thank-you page shows a valid reference and ignores junk", async ({ page }) => {
    await page.goto("/foundation/thanks?ref=FDN-2026-0042");
    await expect(page.locator("h1")).toHaveText("Thank you");
    await expect(page.getByTestId("reference")).toHaveText("FDN-2026-0042");
    await page.goto("/foundation/thanks?ref=<script>alert(1)</script>");
    await expect(page.getByTestId("reference")).toHaveCount(0);
  });
});

test.describe("POST /api/foundation/apply", () => {
  test("5 per IP per hour, then 429", async ({ request }) => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 20}`;
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request.post("/api/foundation/apply", {
        headers: { "x-forwarded-for": ip },
        multipart: { applicant_name: "x" },
      });
      statuses.push(res.status());
    }
    expect(statuses.slice(0, 5)).not.toContain(429);
    expect(statuses[5]).toBe(429);
  });

  test("refuses cross-site posts", async ({ request }) => {
    const res = await request.post("/api/foundation/apply", {
      headers: { origin: "https://evil.example", "x-forwarded-for": "203.0.113.250" },
      multipart: { applicant_name: "x" },
    });
    expect(res.status()).toBe(403);
  });
});
