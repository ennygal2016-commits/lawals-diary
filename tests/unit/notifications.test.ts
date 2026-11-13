import { createElement } from "react";
import { render } from "@react-email/components";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DigestEmail } from "@/emails/digest-email";
import { NotificationEmail } from "@/emails/notification-email";
import { tokenHex } from "@/lib/design-tokens";
import {
  DEFAULT_PREFS,
  NOTIFICATION_TYPES,
  describeNotification,
  excerptOf,
  parsePrefs,
  pickForDigest,
} from "@/lib/notifications";
import { notifyPrefsSchema } from "@/lib/validation/notifications";

describe("describeNotification", () => {
  it("reads naturally, uses nicknames (no pronouns) and links to the right place", () => {
    expect(
      describeNotification("entry", { from: "D_Gal", title: "Rain on the train home", entry_id: "e1" }),
    ).toEqual({
      text: "D_Gal wrote “Rain on the train home”",
      href: "/admin/entries/e1",
      emailLine: "D_Gal wrote a new entry",
    });
    expect(
      describeNotification("comment", { from: "Kuleo", title: "Lake", entry_id: "e2", excerpt: "So good" }),
    ).toMatchObject({
      text: "Kuleo commented on “Lake”",
      excerpt: "So good",
      href: "/admin/entries/e2#comments-heading",
    });
    expect(describeNotification("note", { from: "Kuleo", excerpt: "Umbrella!" }).text).toBe(
      "Kuleo left you a note",
    );
    expect(describeNotification("note_reply", { from: "D_Gal" }).text).toBe("D_Gal replied to your note");
    expect(
      describeNotification("application", { reference: "FDN-2026-0042", application_id: "a1" }),
    ).toMatchObject({ text: "New foundation application FDN-2026-0042", href: "/admin/foundation/a1" });
  });

  it("email lines never carry titles or excerpts", () => {
    for (const type of NOTIFICATION_TYPES) {
      const d = describeNotification(type, { from: "D_Gal", title: "SECRET TITLE", excerpt: "SECRET WORDS" });
      expect(d.emailLine).not.toMatch(/SECRET/);
      expect(d.emailLine).not.toMatch(/\b(she|he|her|his|him)\b/i);
    }
  });

  it("copes with empty or junk payloads", () => {
    expect(describeNotification("entry", null).text).toBe("Your partner wrote a new entry");
    expect(describeNotification("note", ["x"]).href).toBe("/admin#note-composer-heading");
  });

  it("excerpts are one line and capped", () => {
    expect(excerptOf("  hello\n\n  there ")).toBe("hello there");
    const long = excerptOf("x".repeat(500));
    expect(long).toHaveLength(120);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("email preferences", () => {
  it("fill in defaults and ignore junk", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs({ entry: "instant", note: "weekly", comment: 3 })).toEqual({
      ...DEFAULT_PREFS,
      entry: "instant",
    });
  });

  it("the server only accepts all five types with instant / daily / off", () => {
    expect(notifyPrefsSchema.safeParse(DEFAULT_PREFS).success).toBe(true);
    expect(notifyPrefsSchema.safeParse({ ...DEFAULT_PREFS, note: "weekly" }).success).toBe(false);
    const { entry: _entry, ...missing } = DEFAULT_PREFS;
    expect(notifyPrefsSchema.safeParse(missing).success).toBe(false);
  });
});

describe("pickForDigest", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const n = (id: string, user: string, type: (typeof NOTIFICATION_TYPES)[number], minutesAgo: number) => ({
    id,
    user_id: user,
    type,
    created_at: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
  });

  it("takes daily ones, failed instant ones after a grace period, never off ones — grouped per partner", () => {
    const prefs = new Map([
      ["a", { ...DEFAULT_PREFS, entry: "daily" as const, comment: "off" as const, note: "instant" as const }],
      ["b", { ...DEFAULT_PREFS, entry: "off" as const }],
    ]);
    const picked = pickForDigest(
      [
        n("1", "a", "entry", 60), // daily → yes
        n("2", "a", "comment", 60), // off → no
        n("3", "a", "note", 60), // instant, an hour old, still unsent → yes (instant failed)
        n("4", "a", "note", 2), // instant, just now → no (instant send still in flight)
        n("5", "b", "entry", 60), // off → no
        n("6", "b", "comment", 60), // default daily → yes
      ],
      prefs,
      now,
    );
    expect(picked.get("a")?.map((x) => x.id)).toEqual(["1", "3"]);
    expect(picked.get("b")?.map((x) => x.id)).toEqual(["6"]);
  });
});

describe("emails (React Email, our tokens)", () => {
  it("the instant email: one line, one button, dark tokens, no images or private content", async () => {
    const html = await render(
      createElement(NotificationEmail, {
        line: "D_Gal left you a note",
        href: "/admin",
        siteUrl: "https://diary.example",
      }),
    );
    expect(html).toContain("D_Gal left you a note");
    expect(html).toContain('href="https://diary.example/admin"');
    expect(html).toContain(tokenHex("bg"));
    expect(html).toContain(tokenHex("accent"));
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain("/admin/settings#notifications-heading");
  });

  it("the digest lists every item with its link", async () => {
    const html = await render(
      createElement(DigestEmail, {
        siteUrl: "https://diary.example",
        date: "Tuesday 3 November",
        items: [
          { line: "Kuleo wrote a new entry", href: "/admin/entries/e1", when: "Today · 09:12" },
          {
            line: "Kuleo commented on an entry",
            href: "/admin/entries/e2#comments-heading",
            when: "Yesterday · 21:30",
          },
        ],
      }),
    );
    expect(html).toContain("2 things in your diary");
    expect(html).toContain("https://diary.example/admin/entries/e1");
    expect(html).toContain("Yesterday · 21:30");
    expect(html).toContain("Tuesday 3 November");
  });
});

describe("delivery without configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends nothing and touches nothing when Resend isn't set up", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendEmail, emailConfigured } = await import("@/server/notifications/mailer");
    const { deliverInstant } = await import("@/server/notifications/notify");
    expect(emailConfigured()).toBe(false);
    expect(await sendEmail({ to: "x@example.com", subject: "s", html: "h", text: "t" })).toBe(false);
    expect(await deliverInstant(["3f0c2b9e-4b7a-4c1e-9a55-0d6f1b2c3d4e"])).toBe(0);
  });
});

describe("GET /api/cron/digest", () => {
  afterEach(() => vi.unstubAllEnvs());
  const call = async (auth?: string) => {
    const { GET } = await import("@/app/api/cron/digest/route");
    const req = new NextRequest("http://localhost/api/cron/digest", {
      headers: auth ? { authorization: auth } : {},
    });
    return (await GET(req)).status;
  };

  it("refuses everyone when CRON_SECRET isn't set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(await call("Bearer ")).toBe(401);
  });

  it("needs the exact bearer secret", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-random-cron-secret-123");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await call()).toBe(401);
    expect(await call("Bearer wrong")).toBe(401);
    expect(await call("a-long-random-cron-secret-123")).toBe(401);
    // Right secret, but no database here → 503 (it got past the auth check).
    expect(await call("Bearer a-long-random-cron-secret-123")).toBe(503);
  });
});
