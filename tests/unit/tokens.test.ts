import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/lib/contrast";
import { ALL_COLOR_TOKENS, tokenHex } from "@/lib/design-tokens";

/** Parse the :root custom properties out of globals.css. */
function cssTokens(): Map<string, string> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const root = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
  const map = new Map<string, string>();
  for (const m of root.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi)) map.set(m[1]!, m[2]!.toLowerCase());
  return map;
}

describe("design tokens", () => {
  it("TypeScript mirror matches globals.css exactly", () => {
    const css = cssTokens();
    for (const t of ALL_COLOR_TOKENS) expect(css.get(t.name), `--${t.name}`).toBe(t.hex);
    const mirrored = new Set(ALL_COLOR_TOKENS.map((t) => t.name));
    for (const name of css.keys())
      expect(mirrored.has(name), `--${name} missing from design-tokens.ts`).toBe(true);
  });

  const backgrounds = ["bg", "surface", "raised", "overlay", "note", "selected"];
  const bodyText = ["fg", "fg-soft", "muted", "faint", "accent", "lavender", "success", "warning", "danger"];

  it.each(bodyText)("text token %s meets 4.5:1 on every surface (WCAG 1.4.3)", (fg) => {
    for (const bg of backgrounds) {
      expect(contrastRatio(tokenHex(fg), tokenHex(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("--subtle is only for large text: 3:1 on bg, surface and raised", () => {
    for (const bg of ["bg", "surface", "raised"]) {
      expect(contrastRatio(tokenHex("subtle"), tokenHex(bg))).toBeGreaterThanOrEqual(3);
    }
    // and it must NOT pass 4.5 — if it ever does, fold it into --faint instead
    expect(contrastRatio(tokenHex("subtle"), tokenHex("bg"))).toBeLessThan(4.5);
  });

  it.each([
    ["accent-ink", "accent"],
    ["inverse-ink", "inverse"],
    ["lavender-ink", "lavender"],
    ["accent", "accent-soft"],
    ["lavender-text", "lavender-soft"],
    ["accent-hover", "accent-soft"],
    ["fg", "danger-soft"],
    ["danger", "danger-soft"],
  ])("%s on %s meets 4.5:1", (fg, bg) => {
    expect(contrastRatio(tokenHex(fg), tokenHex(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it("focus ring (accent) meets 3:1 against every surface (WCAG 1.4.11, 2.4.13)", () => {
    for (const bg of backgrounds)
      expect(contrastRatio(tokenHex("accent"), tokenHex(bg))).toBeGreaterThanOrEqual(3);
  });

  it("mood dots are distinguishable from the card surface (3:1, non-text)", () => {
    for (const t of ALL_COLOR_TOKENS.filter((x) => x.name.startsWith("mood-"))) {
      expect(contrastRatio(t.hex, tokenHex("surface")), t.name).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("rejects malformed colours", () => {
    expect(() => contrastRatio("red", "#ffffff")).toThrow();
  });
});
