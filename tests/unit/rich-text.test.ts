import { describe, expect, it } from "vitest";

import { EMPTY_DOC, docToPlainText, isDocEmpty, safeHref, sanitizeDoc } from "@/lib/rich-text";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: unknown[]) => ({ type: "text", text, ...(marks ? { marks } : {}) });

describe("sanitizeDoc", () => {
  it("keeps the allowed nodes and marks untouched", () => {
    const input = doc(
      { type: "heading", attrs: { level: 2 }, content: [t("Saturday")] },
      p(t("We walked "), t("all", [{ type: "bold" }, { type: "italic" }]), t(" day."), { type: "hardBreak" }),
      { type: "bulletList", content: [{ type: "listItem", content: [p(t("tea"))] }] },
      { type: "blockquote", content: [p(t("Two are better than one"))] },
      p(t("map", [{ type: "link", attrs: { href: "https://example.com/a?b=1" } }])),
    );
    expect(sanitizeDoc(input)).toEqual(input);
  });

  it("drops unknown marks, attributes, styles and duplicate marks", () => {
    const out = sanitizeDoc(
      doc(
        p(
          t("x", [
            { type: "bold" },
            { type: "bold" },
            { type: "textStyle", attrs: { color: "red" } },
            { type: "link", attrs: { href: "https://ok.example", target: "_blank", onclick: "evil()" } },
          ]),
        ),
      ),
    );
    expect(out).toEqual(
      doc(p(t("x", [{ type: "bold" }, { type: "link", attrs: { href: "https://ok.example/" } }]))),
    );
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "vbscript:x", "ftp://x.example", "  ", 42, null])(
    "removes unsafe link %s",
    (href) => {
      const out = sanitizeDoc(doc(p(t("x", [{ type: "link", attrs: { href } }]))));
      expect(out).toEqual(doc(p(t("x"))));
    },
  );

  it("turns other heading levels into H2 and unknown blocks into plain paragraphs", () => {
    const out = sanitizeDoc(
      doc(
        { type: "heading", attrs: { level: 1 }, content: [t("Big")] },
        { type: "image", attrs: { src: "https://tracker.example/pixel.gif" } },
        { type: "codeBlock", content: [t("console.log(1)")] },
      ),
    );
    expect(out).toEqual(
      doc({ type: "heading", attrs: { level: 2 }, content: [t("Big")] }, p(t("console.log(1)"))),
    );
  });

  it("returns an empty doc for garbage and never throws", () => {
    for (const bad of [null, "doc", 1, [], { type: "paragraph" }, { type: "doc", content: "x" }]) {
      expect(sanitizeDoc(bad)).toEqual(EMPTY_DOC);
    }
  });

  it("stops at a depth limit instead of recursing forever", () => {
    let node: unknown = p(t("deep"));
    for (let i = 0; i < 500; i++) node = { type: "blockquote", content: [node] };
    expect(() => sanitizeDoc(doc(node))).not.toThrow();
  });
});

describe("docToPlainText (body_text for search)", () => {
  it("joins blocks with newlines and keeps link text", () => {
    const d = sanitizeDoc(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [t("Lake")] },
        p(t("Walked to the "), t("pier", [{ type: "link", attrs: { href: "https://maps.example" } }])),
        { type: "bulletList", content: [{ type: "listItem", content: [p(t("ducks"))] }] },
      ),
    );
    expect(docToPlainText(d)).toBe("Lake\nWalked to the pier\nducks");
  });

  it("knows an empty doc", () => {
    expect(isDocEmpty(EMPTY_DOC)).toBe(true);
    expect(isDocEmpty(sanitizeDoc(doc(p(t("  ")))))).toBe(true);
  });
});

describe("safeHref", () => {
  it("allows https, http and mailto only", () => {
    expect(safeHref("https://a.example")).toBe("https://a.example/");
    expect(safeHref("http://a.example/x")).toBe("http://a.example/x");
    expect(safeHref("mailto:nurat@example.com")).toBe("mailto:nurat@example.com");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("/admin")).toBeNull();
  });
});
