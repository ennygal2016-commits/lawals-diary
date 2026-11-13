/**
 * Site-wide constants. Display names and nicknames are seeded into `profiles` in Phase 2 and
 * become editable in Settings; these values are the defaults and are used until auth exists.
 * Emails are deliberately NOT here — the admin allowlist lives in the ADMIN_EMAILS env var.
 */
export const SITE_NAME = "Lawal's diary";
export const SITE_TAGLINE = "Two people, one diary, and a small foundation in our name.";

/** Shared IANA time zone for the daily pick and calendar days. Observes EST/EDT automatically. */
export const SHARED_TIMEZONE = process.env.NEXT_PUBLIC_SHARED_TIMEZONE || "America/Toronto";

export type PartnerKey = "a" | "b";

export type Partner = {
  key: PartnerKey;
  displayName: string;
  nickname: string;
};

/** Partner A is pink (accent), partner B is lavender — see DESIGN.md §2 "Partner colours". */
export const PARTNERS: Record<PartnerKey, Partner> = {
  a: { key: "a", displayName: "Nurat", nickname: "D_Gal" },
  b: { key: "b", displayName: "Afeez", nickname: "Kuleo" },
};

export function otherPartner(key: PartnerKey): Partner {
  return PARTNERS[key === "a" ? "b" : "a"];
}

export function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return Array.from(trimmed)[0]!.toLocaleUpperCase("en");
}
