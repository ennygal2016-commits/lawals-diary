import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Privacy (master prompt rule 1): every server action except sign-in must check the session before doing
 * anything. Server actions are public POST endpoints, so this is checked statically for each exported function:
 * its body must call supabase.auth.getUser() or a local helper that does. RLS is the second wall behind it.
 */
const DIR = "src/server/actions";
const PUBLIC_ACTIONS = new Set(["auth.ts:signInWithPassword", "auth.ts:sendMagicLink"]);

type Fn = { name: string; exported: boolean; body: string };

function functionsOf(source: string): Fn[] {
  const re = /^(export )?(?:async )?function (\w+)/gm;
  const marks = [...source.matchAll(re)];
  return marks.map((m, i) => ({
    name: m[2]!,
    exported: !!m[1],
    body: source.slice(m.index, marks[i + 1]?.index ?? source.length),
  }));
}

describe("server actions check the session first", () => {
  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".ts"))) {
    const source = readFileSync(join(DIR, file), "utf8");
    if (!/^["']use server["']/m.test(source)) continue;
    const fns = functionsOf(source);
    // Helpers that reach getUser(), directly or through another helper.
    const guards = new Set<string>();
    for (let changed = true; changed;) {
      changed = false;
      for (const f of fns) {
        if (guards.has(f.name)) continue;
        const callsGuard = [...guards].some((g) =>
          [" ", "(", "!"].some((pre) => f.body.includes(`${pre}${g}(`)),
        );
        if (/auth\.getUser\(\)/.test(f.body) || /\bgetViewer\(/.test(f.body) || callsGuard) {
          guards.add(f.name);
          changed = true;
        }
      }
    }
    for (const f of fns.filter((x) => x.exported)) {
      if (PUBLIC_ACTIONS.has(`${file}:${f.name}`)) continue;
      it(`${file} → ${f.name}`, () => {
        expect(guards.has(f.name), `${f.name} never checks the signed-in user`).toBe(true);
      });
    }
  }
});
