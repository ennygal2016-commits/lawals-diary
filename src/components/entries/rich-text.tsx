import type * as React from "react";

import type { BlockNode, InlineNode, RichDoc } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/** Renders a sanitised entry body as React elements — no innerHTML, so nothing in a body can run. */
export function RichText({ doc, className }: { doc: RichDoc; className?: string }) {
  return <div className={cn("diary-prose", className)}>{doc.content.map((b, i) => block(b, i))}</div>;
}

function block(node: BlockNode, key: number): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{inline(node.content)}</p>;
    case "heading":
      // Entry bodies sit under the page's h1 (the title), so the editor's "H2" is an h2.
      return <h2 key={key}>{inline(node.content)}</h2>;
    case "blockquote":
      return <blockquote key={key}>{node.content.map((b, i) => block(b, i))}</blockquote>;
    case "bulletList":
      return (
        <ul key={key}>
          {node.content.map((li, i) => (
            <li key={i}>{li.content.map((b, j) => block(b, j))}</li>
          ))}
        </ul>
      );
  }
}

function inline(content: InlineNode[] | undefined): React.ReactNode {
  return (content ?? []).map((n, i) => {
    if (n.type === "hardBreak") return <br key={i} />;
    let out: React.ReactNode = n.text;
    for (const mark of n.marks ?? []) {
      if (mark.type === "bold") out = <strong>{out}</strong>;
      else if (mark.type === "italic") out = <em>{out}</em>;
      else if (mark.type === "link")
        out = (
          <a href={mark.attrs.href} rel="noopener noreferrer nofollow" target="_blank">
            {out}
          </a>
        );
    }
    return <span key={i}>{out}</span>;
  });
}
