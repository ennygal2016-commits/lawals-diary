/**
 * Seed script (Phase 2). Idempotent — safe to run again.
 *
 *   npm run db:seed
 *
 * Reads .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS (partner A first,
 * then partner B). Optional ADMIN_PASSWORD_A / ADMIN_PASSWORD_B set (or reset) each account's password —
 * use these only on a development project; on production let each partner sign in with a magic link.
 *
 * Does: allowlist → both auth users (+ profiles, via the database trigger) → settings → about page → daily content.
 */
import { createClient } from "@supabase/supabase-js";

import { DAILY_CONTENT } from "../src/lib/daily-content.ts";
import type { Database, PartnerKey } from "../src/types/database.ts";

const PARTNER_DEFAULTS: Record<PartnerKey, { display_name: string; nickname: string }> = {
  a: { display_name: "Nurat", nickname: "D_Gal" },
  b: { display_name: "Afeez", nickname: "Kuleo" },
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
const emails = required("ADMIN_EMAILS")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
if (emails.length !== 2 || emails[0] === emails[1]) {
  console.error("ADMIN_EMAILS must hold exactly two different emails: partner A first, then partner B.");
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Result = { data: unknown; error: { message: string } | null };
/** Await a Supabase call; exit on error, otherwise return the success-branch data. */
async function must<R extends Result>(
  label: string,
  op: PromiseLike<R>,
): Promise<Extract<R, { error: null }>["data"]> {
  const { data, error } = await op;
  if (error) {
    console.error(`✗ ${label}: ${error.message}`);
    process.exit(1);
  }
  return data as Extract<R, { error: null }>["data"];
}

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page < 20; page++) {
    const { users } = await must("list users", supabase.auth.admin.listUsers({ page, perPage: 200 }));
    const hit = users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

const partners: PartnerKey[] = ["a", "b"];

// 1. Allowlist — must exist before the auth users, or the trigger rejects them.
await must(
  "allowlist",
  supabase.from("admin_allowlist").upsert(
    partners.map((partner, i) => ({ partner, email: emails[i]!, ...PARTNER_DEFAULTS[partner] })),
    { onConflict: "partner" },
  ),
);
console.log("✓ allowlist (2 emails)");

// 2. Auth users and profiles.
for (const [i, partner] of partners.entries()) {
  const email = emails[i]!;
  const password = process.env[`ADMIN_PASSWORD_${partner.toUpperCase()}`]?.trim() || undefined;
  let userId = await findUserId(email);

  if (!userId) {
    const { user } = await must(
      `create user ${partner}`,
      supabase.auth.admin.createUser({ email, password, email_confirm: true }),
    );
    userId = user.id;
    console.log(`✓ created partner ${partner.toUpperCase()} account`);
  } else if (password) {
    await must(`set password ${partner}`, supabase.auth.admin.updateUserById(userId, { password }));
    console.log(`✓ partner ${partner.toUpperCase()} account exists (password updated)`);
  } else {
    console.log(`✓ partner ${partner.toUpperCase()} account exists`);
  }

  // The trigger creates the profile on sign-up; this covers accounts that existed before the trigger.
  await must(
    `profile ${partner}`,
    supabase
      .from("profiles")
      .upsert(
        { user_id: userId, partner, ...PARTNER_DEFAULTS[partner] },
        { onConflict: "user_id", ignoreDuplicates: true },
      ),
  );
}
console.log("✓ profiles");

// 3. Single-row tables.
await must(
  "settings",
  supabase
    .from("settings")
    .upsert(
      { singleton: true, bible_translation: "KJV" },
      { onConflict: "singleton", ignoreDuplicates: true },
    ),
);
await must(
  "about page",
  supabase
    .from("about_page")
    .upsert({ singleton: true }, { onConflict: "singleton", ignoreDuplicates: true }),
);
console.log("✓ settings and about page");

// 4. Daily content.
await must(
  "daily content",
  supabase.from("daily_content").upsert(DAILY_CONTENT, { onConflict: "kind,text", ignoreDuplicates: true }),
);
const counts = DAILY_CONTENT.reduce<Record<string, number>>((acc, item) => {
  acc[item.kind] = (acc[item.kind] ?? 0) + 1;
  return acc;
}, {});
console.log(
  `✓ daily content (${Object.entries(counts)
    .map(([k, n]) => `${k} ${n}`)
    .join(", ")})`,
);
console.log("Seed complete.");
