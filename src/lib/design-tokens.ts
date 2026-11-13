/**
 * Mirror of the colour tokens in src/app/globals.css, for the styleguide and tests.
 * tests/unit/tokens.test.ts fails if the two drift apart.
 */
export type ColorToken = { name: string; hex: string; use: string };

export const COLOR_GROUPS: { title: string; tokens: ColorToken[] }[] = [
  {
    title: "Surfaces",
    tokens: [
      { name: "bg", hex: "#0e0c14", use: "Page background" },
      { name: "surface", hex: "#15121c", use: "Cards and panels" },
      { name: "raised", hex: "#17141f", use: "Inputs, icon buttons" },
      { name: "overlay", hex: "#1c1826", use: "Menus, dialogs, subtle buttons" },
      { name: "note", hex: "#1a1420", use: "Highlighted note card" },
      { name: "selected", hex: "#1f1a28", use: "Selected tile fill" },
      { name: "placeholder-tint", hex: "#1d1826", use: "Photo placeholder" },
    ],
  },
  {
    title: "Lines",
    tokens: [
      { name: "border", hex: "#2a2535", use: "Card and input borders" },
      { name: "border-strong", hex: "#2e2838", use: "Chips, featured card, rails" },
      { name: "border-accent", hex: "#3a2f45", use: "Note composer, dialogs, CTA" },
      { name: "border-muted", hex: "#3a3345", use: "Subtle pills, dashed empty states" },
      { name: "border-dashed", hex: "#4a4356", use: "Dashed add / More filters" },
      { name: "divider", hex: "#241f2e", use: "Header and month rules" },
      { name: "divider-soft", hex: "#1e1a26", use: "List row dividers" },
    ],
  },
  {
    title: "Text",
    tokens: [
      { name: "fg", hex: "#f2edf5", use: "Body and headings" },
      { name: "fg-soft", hex: "#c9c2d3", use: "Nav links, secondary copy" },
      { name: "muted", hex: "#a49db0", use: "Eyebrows, meta" },
      { name: "faint", hex: "#8e879a", use: "Timestamps, counters, placeholders" },
      { name: "subtle", hex: "#6f6880", use: "Large text only (≥24px)" },
    ],
  },
  {
    title: "Accent and partners",
    tokens: [
      { name: "accent", hex: "#ff8a9b", use: "Partner A, primary actions, links" },
      { name: "accent-hover", hex: "#ffb3be", use: "Hover" },
      { name: "accent-ink", hex: "#1a0e12", use: "Text on accent" },
      { name: "accent-soft", hex: "#2a1e28", use: "Active nav pill" },
      { name: "lavender", hex: "#b9a6ff", use: "Partner B, badges, public" },
      { name: "lavender-ink", hex: "#140f22", use: "Text on lavender" },
      { name: "lavender-soft", hex: "#221d33", use: "Partner B avatar fill" },
      { name: "lavender-text", hex: "#d9ceff", use: "Partner B avatar initial" },
    ],
  },
  {
    title: "Status and inverse",
    tokens: [
      { name: "success", hex: "#7ee0b5", use: "Draft saved, live dot" },
      { name: "warning", hex: "#ffc98a", use: "Warnings" },
      { name: "danger", hex: "#ff6b6b", use: "Delete, errors" },
      { name: "danger-soft", hex: "#2c1517", use: "Error toast fill" },
      { name: "inverse", hex: "#f2edf5", use: "Selected chips, today, quick-write, toast" },
      { name: "inverse-ink", hex: "#0e0c14", use: "Text on inverse" },
    ],
  },
  {
    title: "Moods",
    tokens: [
      { name: "mood-loved", hex: "#ff8a9b", use: "Loved" },
      { name: "mood-happy", hex: "#ffc98a", use: "Happy" },
      { name: "mood-calm", hex: "#7ec8e0", use: "Calm" },
      { name: "mood-excited", hex: "#b9a6ff", use: "Excited" },
      { name: "mood-funny", hex: "#7ee0b5", use: "Funny" },
      { name: "mood-tired", hex: "#8e879a", use: "Tired" },
      { name: "mood-bittersweet", hex: "#d6a3c9", use: "Bittersweet" },
      { name: "mood-sad", hex: "#6f8fd1", use: "Sad" },
    ],
  },
];

export const ALL_COLOR_TOKENS: ColorToken[] = COLOR_GROUPS.flatMap((g) => g.tokens);

export function tokenHex(name: string): string {
  const t = ALL_COLOR_TOKENS.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown token ${name}`);
  return t.hex;
}
