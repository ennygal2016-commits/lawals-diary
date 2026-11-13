import { expect, test } from "@playwright/test";

// The entry form on /styleguide/entry (no database or sign-in needed).
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("entry form (preview)", () => {
  test("fields in PRD order, one h1, no sideways scroll", async ({ page }) => {
    await page.goto("/styleguide/entry?empty=1");
    await expect(page.locator("h1")).toHaveCount(1);
    const labels = ["Title", "Date", "Location", "Mood", "Category", "Photos", "What happened?"];
    const tops: number[] = [];
    for (const label of labels) {
      const box = await page
        .locator("label, .eyebrow")
        .filter({ hasText: new RegExp(`^${label.replace(/\?/g, "\\?")}`) })
        .first()
        .boundingBox();
      tops.push(box!.y);
    }
    // Date and Location sit side by side; everything else goes down the page in order.
    expect(Math.abs(tops[1]! - tops[2]!)).toBeLessThan(2);
    for (let i = 2; i < tops.length - 1; i++) expect(tops[i + 1]!).toBeGreaterThan(tops[i]!);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
    await expect(page.getByLabel("Title")).toHaveAttribute("placeholder", "Give the day a name");
    await expect(page.getByLabel("Location")).toHaveAttribute("placeholder", "Where were you?");
  });

  test("mood: 4 × 2 toggle tiles, press again to clear", async ({ page }) => {
    await page.goto("/styleguide/entry?empty=1");
    const mood = page.getByRole("group", { name: "Mood" });
    await expect(mood.getByRole("button")).toHaveCount(8);
    const loved = mood.getByRole("button", { name: "Loved" });
    const sad = mood.getByRole("button", { name: "Sad" });
    const lovedBox = (await loved.boundingBox())!;
    const sadBox = (await sad.boundingBox())!;
    expect(sadBox.y).toBeGreaterThan(lovedBox.y + lovedBox.height - 1); // second row
    await loved.click();
    await expect(loved).toHaveAttribute("aria-pressed", "true");
    await sad.click();
    await expect(loved).toHaveAttribute("aria-pressed", "false");
    await sad.click();
    await expect(sad).toHaveAttribute("aria-pressed", "false");
  });

  test("category chips: one selected, Everyday by default", async ({ page }) => {
    await page.goto("/styleguide/entry?empty=1");
    const group = page.getByRole("group", { name: "Category" });
    await expect(group.getByRole("button", { name: "Everyday" })).toHaveAttribute("aria-pressed", "true");
    await group.getByRole("button", { name: "Travel" }).click();
    await expect(group.getByRole("button", { name: "Travel" })).toHaveAttribute("aria-pressed", "true");
    await expect(group.getByRole("button", { name: "Everyday" })).toHaveAttribute("aria-pressed", "false");
  });

  test("editor: the six tools, keyboard toolbar, bold toggles", async ({ page }) => {
    await page.goto("/styleguide/entry?empty=1");
    const toolbar = page.getByRole("toolbar", { name: "Formatting" });
    for (const name of ["Bold", "Italic", "Heading", "Bullet list", "Quote", "Link"]) {
      await expect(toolbar.getByRole("button", { name })).toBeVisible();
    }
    const editor = page.getByRole("textbox", { name: "What happened?" });
    await editor.click();
    await page.keyboard.type("We walked ");
    await toolbar.getByRole("button", { name: "Bold" }).click();
    await page.keyboard.type("all day");
    await expect(editor.locator("strong")).toHaveText("all day");
    await expect(toolbar.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");

    await toolbar.getByRole("button", { name: "Bold" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(toolbar.getByRole("button", { name: "Italic" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(toolbar.getByRole("button", { name: "Link" })).toBeFocused();
  });

  test("pasting rich HTML keeps only the allowed formatting", async ({ page }) => {
    await page.goto("/styleguide/entry?empty=1");
    const editor = page.getByRole("textbox", { name: "What happened?" });
    await editor.click();
    await page.evaluate(() => {
      const data = new DataTransfer();
      data.setData(
        "text/html",
        '<h1 style="color:red">Big</h1><p><span style="font-size:40px">styled</span> <b>bold</b><img src="https://x.example/p.gif"></p><table><tr><td>cell</td></tr></table>',
      );
      document
        .querySelector(".ProseMirror")!
        .dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await expect(editor.locator("h2")).toHaveText("Big");
    await expect(editor.locator("strong")).toHaveText("bold");
    await expect(editor.locator("img, table, h1, [style]")).toHaveCount(0);
  });

  test("link dialog refuses javascript: links", async ({ page }) => {
    await page.goto("/styleguide/entry?empty=1");
    await page.getByRole("textbox", { name: "What happened?" }).click();
    await page.getByRole("toolbar", { name: "Formatting" }).getByRole("button", { name: "Link" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a link" });
    await dialog.getByLabel("Link address").fill("javascript:alert(1)");
    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect(dialog.getByText(/Use a web address/)).toBeVisible();
    await dialog.getByLabel("Link address").fill("example.com/lake");
    await dialog.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("textbox", { name: "What happened?" }).locator("a")).toHaveAttribute(
      "href",
      "https://example.com/lake",
    );
  });

  test("visibility toggle and the sticky Save entry bar", async ({ page }) => {
    await page.goto("/styleguide/entry?empty=1");
    const toggle = page.getByRole("button", { name: "Private" });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Public" })).toBeVisible();
    const save = page.getByRole("button", { name: "Save entry" });
    const viewport = page.viewportSize()!;
    const box = (await save.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height); // pinned in view without scrolling
  });

  test("Save entry without a title shows the error", async ({ page }) => {
    await page.goto("/styleguide/entry?empty=1");
    await page.getByRole("button", { name: "Save entry" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Give the day a name." })).toBeVisible();
  });

  test("close X asks before discarding changes", async ({ page }) => {
    await page.goto("/styleguide/entry?empty=1");
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(/\/styleguide$/); // nothing changed → closes straight away

    await page.goto("/styleguide/entry?empty=1");
    await page.getByLabel("Title").fill("A thought");
    await expect(page.getByRole("status").filter({ hasText: /Unsaved changes|Saving/ })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    const dialog = page.getByRole("dialog", { name: "Discard changes?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await expect(dialog).toBeHidden(); // let the closing animation finish before reopening
    await expect(page.getByLabel("Title")).toHaveValue("A thought");
    await page.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Discard" }).click();
    await expect(page).toHaveURL(/\/styleguide$/);
  });
});
