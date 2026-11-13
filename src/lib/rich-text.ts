/**
 * The entry body format (PRD FR-14): Tiptap/ProseMirror JSON limited to paragraph, H2, bullet list, quote and hard
 * break, with bold, italic and link marks. Everything the server stores goes through sanitizeDoc — unknown nodes,
 * marks and attributes are dropped, links are limited to http(s)/mailto. Pure: no DOM, safe on the server.
 */

export type Mark = { type: "bold" } | { type: "italic" } | { type: "link"; attrs: { href: string } };

export type InlineNode = { type: "text"; text: string; marks?: Mark[] } | { type: "hardBreak" };

export type BlockNode =
  | { type: "paragraph"; content?: InlineNode[] }
  | { type: "heading"; attrs: { level: 2 }; content?: InlineNode[] }
  | { type: "blockquote"; content: BlockNode[] }
  | { type: "bulletList"; content: ListItemNode[] };

export type ListItemNode = { type: "listItem"; content: BlockNode[] };

export type RichDoc = { type: "doc"; content: BlockNode[] };

export const EMPTY_DOC: RichDoc = { type: "doc", content: [{ type: "paragraph" }] };

/** Hard limits so a body can't be used to blow up storage or rendering. */
export const BODY_TEXT_MAX = 100_000;
const MAX_DEPTH = 12;
const MAX_NODES = 20_000;
const HREF_MAX = 2_000;

export function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const href = raw.trim();
  if (!href || href.length > HREF_MAX) return null;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(href)) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

type Budget = { nodes: number };

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sanitizeMarks(raw: unknown): Mark[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const marks: Mark[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const m = obj(item);
    if (!m || typeof m.type !== "string" || seen.has(m.type)) continue;
    if (m.type === "bold" || m.type === "italic") {
      marks.push({ type: m.type });
      seen.add(m.type);
    } else if (m.type === "link") {
      const href = safeHref(obj(m.attrs)?.href);
      if (href) {
        marks.push({ type: "link", attrs: { href } });
        seen.add("link");
      }
    }
  }
  return marks.length ? marks : undefined;
}

function sanitizeInline(raw: unknown, budget: Budget): InlineNode[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: InlineNode[] = [];
  for (const item of raw) {
    if (++budget.nodes > MAX_NODES) break;
    const n = obj(item);
    if (!n) continue;
    if (n.type === "hardBreak") out.push({ type: "hardBreak" });
    else if (n.type === "text" && typeof n.text === "string" && n.text.length > 0) {
      const marks = sanitizeMarks(n.marks);
      out.push(marks ? { type: "text", text: n.text, marks } : { type: "text", text: n.text });
    }
  }
  return out.length ? out : undefined;
}

function sanitizeBlocks(raw: unknown, depth: number, budget: Budget): BlockNode[] {
  if (!Array.isArray(raw) || depth > MAX_DEPTH) return [];
  const out: BlockNode[] = [];
  for (const item of raw) {
    if (++budget.nodes > MAX_NODES) break;
    const n = obj(item);
    if (!n) continue;
    switch (n.type) {
      case "paragraph": {
        const content = sanitizeInline(n.content, budget);
        out.push(content ? { type: "paragraph", content } : { type: "paragraph" });
        break;
      }
      case "heading": {
        // Only H2 exists; any other level from a paste becomes H2.
        const content = sanitizeInline(n.content, budget);
        out.push(
          content
            ? { type: "heading", attrs: { level: 2 }, content }
            : { type: "heading", attrs: { level: 2 } },
        );
        break;
      }
      case "blockquote": {
        const content = sanitizeBlocks(n.content, depth + 1, budget);
        if (content.length) out.push({ type: "blockquote", content });
        break;
      }
      case "bulletList": {
        const items: ListItemNode[] = [];
        if (Array.isArray(n.content)) {
          for (const li of n.content) {
            const l = obj(li);
            if (l?.type !== "listItem") continue;
            const content = sanitizeBlocks(l.content, depth + 1, budget);
            items.push({ type: "listItem", content: content.length ? content : [{ type: "paragraph" }] });
          }
        }
        if (items.length) out.push({ type: "bulletList", content: items });
        break;
      }
      default: {
        // Unknown block (e.g. pasted image, table, code block): keep its text as a paragraph.
        const text = plainTextOfUnknown(n).trim();
        if (text) out.push({ type: "paragraph", content: [{ type: "text", text }] });
      }
    }
  }
  return out;
}

function plainTextOfUnknown(node: unknown): string {
  const n = obj(node);
  if (!n) return "";
  if (typeof n.text === "string") return n.text;
  return Array.isArray(n.content) ? n.content.map(plainTextOfUnknown).join(" ") : "";
}

/** Returns a clean document, or EMPTY_DOC for anything that isn't a doc. Never throws. */
export function sanitizeDoc(input: unknown): RichDoc {
  const d = obj(input);
  if (!d || d.type !== "doc") return EMPTY_DOC;
  const content = sanitizeBlocks(d.content, 0, { nodes: 0 });
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

function inlineText(content: InlineNode[] | undefined): string {
  return (content ?? []).map((n) => (n.type === "text" ? n.text : "\n")).join("");
}

function blockText(block: BlockNode): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return inlineText(block.content);
    case "blockquote":
      return block.content.map(blockText).join("\n");
    case "bulletList":
      return block.content.map((li) => li.content.map(blockText).join("\n")).join("\n");
  }
}

/** body_text for full-text search and previews: one line per block, trimmed. */
export function docToPlainText(doc: RichDoc): string {
  return doc.content
    .map(blockText)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isDocEmpty(doc: RichDoc): boolean {
  return docToPlainText(doc).length === 0;
}
