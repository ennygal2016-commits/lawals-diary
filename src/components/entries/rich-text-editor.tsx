"use client";

import * as React from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Heading2, Italic, Link2, List, Quote, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { type RichDoc, safeHref } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/**
 * "What happened?" (PRD FR-14): bold, italic, H2, bullet list, quote and link — nothing else. The schema only knows
 * those nodes and marks, so pasted styling, images, tables and code are dropped by ProseMirror on paste.
 */
export function RichTextEditor({
  value,
  onChange,
  onBlur,
  labelId,
  placeholder = "Tell the story of the day…",
}: {
  value: RichDoc;
  onChange: (doc: RichDoc) => void;
  onBlur?: () => void;
  labelId: string;
  placeholder?: string;
}) {
  const onChangeRef = React.useRef(onChange);
  const onBlurRef = React.useRef(onBlur);
  React.useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        orderedList: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
          isAllowedUri: (url) => safeHref(url) !== null,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "diary-prose px-4 py-3.5",
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
      },
      // Belt and braces for pasted HTML: drop inline styles and classes before parsing.
      transformPastedHTML: (html) =>
        html
          .replace(/\s(style|class)="[^"]*"/gi, "")
          // Only H2 exists: other heading levels keep their emphasis as H2 instead of becoming plain text.
          .replace(/<(\/?)h[1-6](\s|>)/gi, "<$1h2$2"),
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getJSON() as RichDoc),
    onBlur: () => onBlurRef.current?.(),
  });

  return (
    <div className="overflow-hidden rounded-btn border border-border bg-bg transition-colors focus-within:border-border-strong">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            list: e.isActive("bulletList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
          }
        : null,
  });
  const [linkOpen, setLinkOpen] = React.useState(false);
  const buttons = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [focusIndex, setFocusIndex] = React.useState(0);

  const tools: Array<{
    key: keyof NonNullable<typeof state>;
    label: string;
    icon: LucideIcon;
    run: () => void;
  }> = [
    { key: "bold", label: "Bold", icon: Bold, run: () => editor?.chain().focus().toggleBold().run() },
    { key: "italic", label: "Italic", icon: Italic, run: () => editor?.chain().focus().toggleItalic().run() },
    {
      key: "h2",
      label: "Heading",
      icon: Heading2,
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "list",
      label: "Bullet list",
      icon: List,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      key: "quote",
      label: "Quote",
      icon: Quote,
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    { key: "link", label: "Link", icon: Link2, run: () => setLinkOpen(true) },
  ];

  // WAI-ARIA toolbar: one tab stop, arrow keys move between buttons.
  function onKeyDown(event: React.KeyboardEvent) {
    const last = tools.length - 1;
    const next =
      event.key === "ArrowRight"
        ? focusIndex === last
          ? 0
          : focusIndex + 1
        : event.key === "ArrowLeft"
          ? focusIndex === 0
            ? last
            : focusIndex - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5"
    >
      {tools.map((tool, i) => (
        <button
          key={tool.key}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          tabIndex={i === focusIndex ? 0 : -1}
          aria-label={tool.label}
          title={tool.label}
          aria-pressed={state?.[tool.key] ?? false}
          disabled={!editor}
          onMouseDown={(e) => e.preventDefault() /* keep the editor selection */}
          onClick={() => {
            setFocusIndex(i);
            tool.run();
          }}
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-[8px] text-fg-soft transition-colors hover:bg-raised hover:text-fg",
            state?.[tool.key] && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent",
          )}
        >
          <tool.icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </button>
      ))}
      <LinkDialog editor={editor} open={linkOpen} onOpenChange={setLinkOpen} />
    </div>
  );
}

function LinkDialog({
  editor,
  open,
  onOpenChange,
}: {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [href, setHref] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (open && editor) {
      setHref((editor.getAttributes("link").href as string | undefined) ?? "");
      setError(undefined);
    }
  }, [open, editor]);

  function apply(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onOpenChange(false);
      return;
    }
    const withProtocol = /^[a-z]+:/i.test(href.trim()) ? href.trim() : `https://${href.trim()}`;
    const safe = safeHref(withProtocol);
    if (!safe) {
      setError("Use a web address (https://…) or an email (mailto:…).");
      return;
    }
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain
        .insertContent({ type: "text", text: href.trim(), marks: [{ type: "link", attrs: { href: safe } }] })
        .run();
    } else {
      chain.setLink({ href: safe }).run();
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add a link</DialogTitle>
          <DialogDescription>Leave it empty to remove the link.</DialogDescription>
        </DialogHeader>
        <form onSubmit={apply} noValidate className="flex flex-col gap-5">
          <Field label="Link address" error={error}>
            {(control) => (
              <Input
                {...control}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={href}
                onChange={(e) => setHref(e.target.value)}
                autoFocus
              />
            )}
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
