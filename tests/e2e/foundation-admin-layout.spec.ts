import { expect, test } from "@playwright/test";

// /styleguide/foundation: the real admin list and detail views with sample data. No DB, no sign-in.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("/admin/foundation (preview)", () => {
  test("intro line, status chips with counts, search, level and Search", async ({ page }) => {
    await page.goto("/styleguide/foundation");
    await expect(page.locator("h1")).toHaveText("Foundation");
    await expect(
      page.getByText(
        "Scholarship and school fees applications from the public page. Only the two of you can see them.",
      ),
    ).toBeVisible();
    const chips = page.getByRole("navigation", { name: "Status" });
    for (const [label, n] of [
      ["All", 7],
      ["New", 2],
      ["Reviewing", 1],
      ["Shortlisted", 1],
      ["Approved", 1],
      ["Declined", 1],
      ["Funded (paid)", 1],
    ] as const) {
      await expect(chips.getByRole("link", { name: `${label} (${n})` })).toBeVisible();
    }
    await expect(chips.getByRole("link", { name: "All (7)" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("searchbox", { name: "Search by name, reference or school" })).toBeVisible();
    await expect(page.getByLabel("Level")).toBeVisible();
    await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Applications" }).getByRole("listitem")).toHaveCount(7);
  });

  test("status chip, search and level go in the URL", async ({ page }) => {
    await page.goto("/styleguide/foundation");
    await page.getByRole("navigation", { name: "Status" }).getByRole("link", { name: "New (2)" }).click();
    await expect(page).toHaveURL(/\?status=new$/);
    await expect(page.getByRole("list", { name: "Applications" }).getByRole("listitem")).toHaveCount(2);

    await page.getByRole("searchbox").fill("FDN-2026-0042");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/status=new&q=FDN-2026-0042/);
    await expect(page.getByText("Tolu Adeyemi")).toBeVisible();
    await expect(page.getByRole("list", { name: "Applications" }).getByRole("listitem")).toHaveCount(1);

    await page.goto("/styleguide/foundation");
    await page.getByLabel("Level").selectOption("primary");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/level=primary/);
    for (const item of await page.getByRole("list", { name: "Applications" }).getByRole("listitem").all()) {
      await expect(item).toContainText("Primary");
    }
  });

  test('empty state: "No applications yet"', async ({ page }) => {
    await page.goto("/styleguide/foundation?empty=1");
    await expect(page.getByText("No applications yet")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the public form" })).toHaveAttribute(
      "href",
      "/foundation",
    );
    await page.goto("/styleguide/foundation?q=nobody");
    await expect(page.getByText("No applications match this search.")).toBeVisible();
  });
});

test.describe("/admin/foundation/[id] (preview)", () => {
  test("every field, documents, status, payment and history", async ({ page }) => {
    await page.goto("/styleguide/foundation/00000000-0000-4000-8000-000000000001");
    await expect(page.locator("h1")).toHaveText("Tolu Adeyemi");
    for (const heading of [
      "Status",
      "Payment",
      "Applicant",
      "Parent or guardian",
      "School and request",
      "Documents",
      "Private notes and history",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
    await expect(page.getByText("funmi@example.com")).toBeVisible();
    await expect(page.getByText("Consent to contact")).toBeVisible();
    await expect(page.getByRole("img", { name: "Document 1.jpg preview" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Document 2\.pdf/ })).toBeVisible();
    await expect(page.locator("p").filter({ hasText: /^Paid/ })).toContainText("$1,250.00");
    await expect(page.getByRole("link", { name: "Receipt" })).toBeVisible();
    const history = page.getByRole("list", { name: "History" });
    await expect(history.getByRole("listitem")).toHaveCount(4);
    await expect(history.getByText("Approved → Funded (paid)")).toBeVisible();
    await expect(history.getByText("Submitted through the public form")).toBeVisible();
  });

  test("status changer, private note and payment form", async ({ page }) => {
    await page.goto("/styleguide/foundation/00000000-0000-4000-8000-000000000001?status=reviewing");
    await expect(page.getByRole("heading", { level: 2, name: "Payment" })).toHaveCount(0); // only for Funded
    const update = page.getByRole("button", { name: "Update status" });
    await expect(update).toBeDisabled();
    await page.getByRole("combobox", { name: "Status" }).selectOption("shortlisted");
    await page.getByLabel("Why (optional)").fill("Strong grades");
    await update.click();
    await expect(page.getByText("Marked shortlisted.").first()).toBeVisible();

    await page.getByLabel("Add a private note").fill("Call the school on Monday.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Note added.").first()).toBeVisible();

    await page.goto("/styleguide/foundation/00000000-0000-4000-8000-000000000001?status=funded");
    await expect(page.getByLabel("Amount paid (CAD)")).toHaveValue("1250.00");
    await expect(page.getByLabel("Date paid")).toHaveValue("2026-11-02");
    await expect(page.getByLabel("Replace receipt")).toBeVisible();
    await page.getByRole("button", { name: "Update payment" }).click();
    await expect(page.getByText("Payment recorded.").first()).toBeVisible();
  });
});
