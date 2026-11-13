import { describe, expect, it } from "vitest";

import { MORE_NAV, PRIMARY_NAV, TAB_MORE_NAV, TAB_NAV, isActive, isEntryFormPath } from "@/lib/nav";
import { PARTNERS, initialOf, otherPartner } from "@/lib/site";

describe("isActive", () => {
  it("matches Home only on /admin itself", () => {
    expect(isActive("/admin", "/admin")).toBe(true);
    expect(isActive("/admin/", "/admin")).toBe(true);
    expect(isActive("/admin/timeline", "/admin")).toBe(false);
  });

  it("matches a section and its sub-pages, but not look-alike prefixes", () => {
    expect(isActive("/admin/foundation", "/admin/foundation")).toBe(true);
    expect(isActive("/admin/foundation/abc", "/admin/foundation")).toBe(true);
    expect(isActive("/admin/foundationx", "/admin/foundation")).toBe(false);
  });

  it("matches the public root exactly", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/journal", "/")).toBe(false);
    expect(isActive("/journal/our-first-snow", "/journal")).toBe(true);
  });
});

describe("isEntryFormPath", () => {
  it.each([
    ["/admin/entries/new", true],
    ["/admin/entries/123/edit", true],
    ["/admin/entries/123", false],
    ["/admin/timeline", false],
  ])("%s → %s", (path, expected) => {
    expect(isEntryFormPath(path)).toBe(expected);
  });
});

describe("navigation config (PRD §4)", () => {
  it("has the top-bar order Home · Timeline · Photos · Foundation · Calendar", () => {
    expect(PRIMARY_NAV.map((i) => i.label)).toEqual(["Home", "Timeline", "Photos", "Foundation", "Calendar"]);
  });

  it("puts Bookshelf, Drafts, About Us editor and Settings under More", () => {
    expect(MORE_NAV.map((i) => i.label)).toEqual(["Bookshelf", "Drafts", "About Us editor", "Settings"]);
  });

  it("keeps every admin destination reachable from the phone tab bar", () => {
    const desktop = [...PRIMARY_NAV, ...MORE_NAV].map((i) => i.href).sort();
    const phone = [...TAB_NAV, ...TAB_MORE_NAV].map((i) => i.href).sort();
    expect(phone).toEqual(desktop);
  });
});

describe("partners", () => {
  it("pairs each partner with the other", () => {
    expect(otherPartner("a")).toBe(PARTNERS.b);
    expect(otherPartner("b")).toBe(PARTNERS.a);
  });

  it("takes the first letter as the initial", () => {
    expect(initialOf("Nurat")).toBe("N");
    expect(initialOf("  afeez")).toBe("A");
    expect(initialOf("")).toBe("?");
  });
});
