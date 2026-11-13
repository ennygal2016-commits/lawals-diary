import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DAILY_CONTENT, type DailyKind } from "@/lib/daily-content";
import { PRIVATE_TABLES } from "@/types/database";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const sql = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
  .join("\n");

const createdTables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]!);

describe("migrations (static checks)", () => {
  it("the TypeScript types list exactly the tables the migrations create", () => {
    expect([...createdTables].sort()).toEqual([...PRIVATE_TABLES].sort());
  });

  it.each(createdTables)("%s has row level security enabled", (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security;`);
  });

  it.each(createdTables)("%s has an updated_at trigger", (table) => {
    const triggerList = sql.match(
      /foreach t in array array\[([\s\S]*?)\]\s*loop\s*execute format\(\s*'create trigger set_updated_at/,
    );
    expect(triggerList?.[1]).toContain(`'${table}'`);
  });

  it("anon loses every table and sequence privilege", () => {
    expect(sql).toContain("revoke all on all tables in schema public from anon;");
    expect(sql).toContain("revoke all on all sequences in schema public from anon;");
  });

  it("anon may only select the public_* views — never a table", () => {
    const grantsToAnon = [...sql.matchAll(/grant ([^;]+) to ([^;]*\banon\b[^;]*);/g)].map((m) =>
      m[1]!.trim(),
    );
    expect(grantsToAnon.length).toBeGreaterThan(0);
    for (const grant of grantsToAnon) {
      expect(grant).toMatch(/^select on /);
      const objects = grant.replace(/^select on /, "").split(/,\s*/);
      for (const o of objects) expect(o).toMatch(/^public\.public_[a-z_]+$/);
    }
    const granted = grantsToAnon.flatMap((g) => g.replace(/^select on /, "").split(/,\s*/));
    expect(new Set(granted)).toEqual(
      new Set([
        "public.public_entries",
        "public.public_photos",
        "public.public_about",
        "public.public_site",
        "public.public_entry_photos",
        "public.public_comments",
      ]),
    );
  });

  it("the allowlist trigger guards inserts and email changes on auth.users", () => {
    expect(sql).toMatch(/before insert or update of email on auth\.users[\s\S]*enforce_admin_allowlist/);
  });

  it("no email address is committed in the migrations", () => {
    expect(sql).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it("private storage buckets are not public", () => {
    expect(sql).toMatch(/\('photos-private', 'photos-private', false/);
    expect(sql).toMatch(/\('foundation-docs', 'foundation-docs', false/);
  });
});

describe("daily content seed", () => {
  const kinds: DailyKind[] = ["scripture", "romance", "love", "faith", "encouragement"];

  it.each(kinds)("has at least 30 %s items", (kind) => {
    expect(DAILY_CONTENT.filter((i) => i.kind === kind).length).toBeGreaterThanOrEqual(30);
  });

  it("has no duplicates (the table is unique on kind + text)", () => {
    const keys = DAILY_CONTENT.map((i) => `${i.kind}|${i.text}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("scripture is KJV with a reference; romance has an attribution", () => {
    for (const item of DAILY_CONTENT.filter((i) => i.kind === "scripture")) {
      expect(item.translation).toBe("KJV");
      expect(item.reference).toMatch(/^[1-3]? ?[A-Z][A-Za-z ]+ \d+:\d+(–\d+)?$/);
    }
    for (const item of DAILY_CONTENT.filter((i) => i.kind === "romance")) {
      expect(item.attribution?.length).toBeGreaterThan(3);
    }
  });

  it("every item fits the 1,000-character limit", () => {
    for (const item of DAILY_CONTENT) expect(item.text.length).toBeLessThanOrEqual(1000);
  });
});
