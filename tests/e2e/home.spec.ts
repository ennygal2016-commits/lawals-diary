import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { MISSING_ENV, signIn, testPartners } from "./helpers";

// Signed in as partner A (D_Gal) via the shared storage state.
const partners = testPartners();
test.skip(!partners, MISSING_ENV);

test.describe("Home", () => {
  test("header: date, greeting with nickname, one h1", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toHaveText(/^Good (morning|afternoon|evening),\s*D_Gal\.$/);
    // "Tuesday 3 November"
    await expect(
      page.getByText(/^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d{1,2} [A-Z][a-z]+$/).first(),
    ).toBeAttached();
  });

  test("scripture card with reference, KJV and the public-domain line; four daily cards", async ({
    page,
  }) => {
    await page.goto("/admin");
    const scripture = page.getByRole("region", { name: "Scripture for today" });
    await expect(scripture).toBeVisible();
    await expect(scripture.getByText(/ · KJV$/)).toBeVisible();
    await expect(scripture.getByText("King James Version — public domain.")).toBeVisible();
    for (const name of [
      "Romance for today",
      "Love for today",
      "Faith for today",
      "Encouragement for today",
    ]) {
      await expect(page.getByRole("region", { name })).toBeAttached();
    }
  });

  test("both partners see the same daily items", async ({ page, browser }) => {
    await page.goto("/admin");
    const mine = await page
      .getByRole("region", { name: "Scripture for today" })
      .locator("blockquote")
      .innerText();
    const theirs = await asPartnerB(browser, async (p) => {
      await p.goto("/admin");
      return p.getByRole("region", { name: "Scripture for today" }).locator("blockquote").innerText();
    });
    expect(theirs).toBe(mine);
  });

  test("New entry button and the Recently section (grid or empty state)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("main").getByRole("link", { name: "New entry" })).toHaveAttribute(
      "href",
      "/admin/entries/new",
    );
    const recently = page.getByRole("region", { name: "Recently" });
    await expect(recently).toBeVisible();
    const cards = recently.locator("li article");
    if ((await cards.count()) === 0) {
      await expect(recently.getByText("Nothing written yet.", { exact: false })).toBeVisible();
    } else {
      expect(await cards.count()).toBeLessThanOrEqual(12); // 6 cards + 6 phone rows (one set hidden)
    }
  });
});

test.describe("notes", () => {
  test.skip(({ isMobile }) => isMobile, "desktop only — writes shared data");
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, MISSING_ENV);
  test.describe.configure({ mode: "serial" });

  const marker = `e2e-note-${Date.now()}`;

  test.afterAll(async () => {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
    await db.from("notes").delete().like("body", `${marker}%`);
  });

  test("send a note, the partner replies once, the sender sees it answered", async ({ page, browser }) => {
    // A sends.
    await page.goto("/admin");
    await page.getByRole("button", { name: "Write a note for Kuleo" }).click();
    const dialog = page.getByRole("dialog", { name: /Leave a note for Kuleo/ });
    await dialog.getByRole("button", { name: "Send note" }).click();
    await expect(dialog.getByText("Write something first.")).toBeVisible();
    await dialog.getByLabel("Your note").fill(`${marker} — see you at seven`);
    await expect(dialog.getByText(/^\d+ \/ 1000$/)).toBeVisible();
    await dialog.getByRole("button", { name: "Send note" }).click();
    await expect(page.getByText("Note sent to Kuleo.").first()).toBeVisible();

    // B reads and replies once.
    await asPartnerB(browser, async (p) => {
      await p.goto("/admin");
      const received = p.getByRole("region", { name: /Earlier notes from D_Gal/ });
      const note = received.getByRole("listitem").filter({ hasText: marker });
      await expect(note).toBeVisible();
      await note.getByRole("button", { name: "Reply once" }).click();
      const reply = p.getByRole("dialog", { name: /Reply to D_Gal/ });
      await reply.getByLabel("Your reply").fill("Can't wait.");
      await reply.getByRole("button", { name: "Send reply" }).click();
      await expect(p.getByText("Reply sent.").first()).toBeVisible();
      await p.reload();
      const answered = p
        .getByRole("region", { name: /Earlier notes from D_Gal/ })
        .getByRole("listitem")
        .filter({ hasText: marker });
      await expect(answered.getByText("You replied")).toBeVisible();
      await expect(answered.getByRole("button", { name: "Reply once" })).toHaveCount(0);
    });

    // A sees the answer.
    await page.reload();
    const sent = page.getByRole("region", { name: /Notes you sent/ });
    await expect(sent.getByRole("button", { name: /Notes you sent/ })).toContainText(/answered\)/);
    await sent.getByRole("button", { name: /Notes you sent/ }).click();
    const mine = sent.getByRole("listitem").filter({ hasText: marker });
    await expect(mine.getByText("Kuleo replied")).toBeVisible();
    await expect(mine.getByText("Can't wait.")).toBeVisible();
  });
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
