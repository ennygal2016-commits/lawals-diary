"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SegmentedFilter } from "@/components/ui/chip";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { DailyItem } from "@/lib/daily";
import { cn } from "@/lib/utils";
import { setDailyActive, upsertDailyContent } from "@/server/actions/settings";
import type { DailyKind } from "@/types/database";

const KINDS: Array<{ value: DailyKind; label: string }> = [
  { value: "scripture", label: "Scripture" },
  { value: "romance", label: "Romance" },
  { value: "love", label: "Love" },
  { value: "faith", label: "Faith" },
  { value: "encouragement", label: "Encouragement" },
];

export type LibraryActions = { upsert: typeof upsertDailyContent; setActive: typeof setDailyActive };
const serverActions: LibraryActions = { upsert: upsertDailyContent, setActive: setDailyActive };

type Draft = { id?: string; text: string; attribution: string; reference: string; translation: string };

/** Daily-content library manager (PRD FR-7, FR-42): by kind — add, edit, turn off. */
export function DailyLibrary({
  items: initial,
  translation,
  actions = serverActions,
}: {
  items: DailyItem[];
  translation: string;
  actions?: LibraryActions;
}) {
  const { toast } = useToast();
  const [items, setItems] = React.useState(initial);
  const [kind, setKind] = React.useState<DailyKind>("scripture");
  const [editing, setEditing] = React.useState<Draft | null>(null);
  const [pending, startTransition] = React.useTransition();

  const list = items.filter((i) => i.kind === kind);
  const activeCount = list.filter((i) => i.active).length;

  function save(d: Draft) {
    startTransition(async () => {
      const r = await actions.upsert({
        id: d.id,
        kind,
        text: d.text,
        attribution: d.attribution,
        reference: d.reference,
        translation: kind === "scripture" ? d.translation || translation : d.translation,
        active: d.id ? (items.find((i) => i.id === d.id)?.active ?? true) : true,
      });
      toast({ title: r.message, variant: r.ok ? "default" : "danger" });
      if (!r.ok || !r.id) return;
      const item: DailyItem = {
        id: r.id,
        kind,
        text: d.text.trim(),
        attribution: d.attribution.trim() || null,
        reference: d.reference.trim() || null,
        translation: kind === "scripture" ? d.translation || translation : d.translation.trim() || null,
        active: d.id ? (items.find((i) => i.id === d.id)?.active ?? true) : true,
      };
      setItems((all) => (d.id ? all.map((i) => (i.id === d.id ? item : i)) : [...all, item]));
      setEditing(null);
    });
  }

  function toggle(item: DailyItem, active: boolean) {
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, active } : i)));
    startTransition(async () => {
      const r = await actions.setActive(item.id, active);
      toast({ title: r.message, variant: r.ok ? "default" : "danger" });
      if (!r.ok) setItems((all) => all.map((i) => (i.id === item.id ? { ...i, active: !active } : i)));
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <SegmentedFilter
        label="Library"
        options={KINDS.map((k) => ({ ...k, count: items.filter((i) => i.kind === k.value).length }))}
        value={kind}
        onValueChange={(k) => {
          setKind(k);
          setEditing(null);
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 font-mono text-[13px] text-muted" aria-live="polite">
          {activeCount} of {list.length} in use
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setEditing({
              text: "",
              attribution: "",
              reference: "",
              translation: kind === "scripture" ? translation : "",
            })
          }
        >
          <Plus aria-hidden strokeWidth={1.75} />
          Add to {KINDS.find((k) => k.value === kind)?.label.toLowerCase()}
        </Button>
      </div>

      {editing && !editing.id ? (
        <ItemForm
          kind={kind}
          draft={editing}
          pending={pending}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      <ul
        className="m-0 flex max-h-[560px] list-none flex-col overflow-y-auto p-0"
        aria-label={`${kind} items`}
      >
        {list.map((item) =>
          editing?.id === item.id ? (
            <li key={item.id} className="border-b border-divider-soft py-4">
              <ItemForm
                kind={kind}
                draft={editing}
                pending={pending}
                onSave={save}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={item.id} className="flex items-start gap-4 border-b border-divider-soft py-4">
              {/* Turned-off items are dimmed with readable muted colours, not opacity (contrast stays AA). */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p
                  className={cn(
                    "serif m-0 text-[18px] leading-snug whitespace-pre-line italic",
                    !item.active && "text-muted",
                  )}
                >
                  {item.text}
                </p>
                {item.reference || item.attribution ? (
                  <p className={cn("m-0 font-mono text-[12px]", item.active ? "text-accent" : "text-muted")}>
                    {[item.reference, item.translation, item.attribution].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setEditing({
                    id: item.id,
                    text: item.text,
                    attribution: item.attribution ?? "",
                    reference: item.reference ?? "",
                    translation: item.translation ?? "",
                  })
                }
              >
                Edit
              </Button>
              <div className="w-[120px] shrink-0">
                <Switch
                  label={item.active ? "In use" : "Off"}
                  checked={item.active}
                  onCheckedChange={(v) => toggle(item, v)}
                />
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function ItemForm({
  kind,
  draft,
  pending,
  onSave,
  onCancel,
}: {
  kind: DailyKind;
  draft: Draft;
  pending: boolean;
  onSave: (d: Draft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = React.useState(draft);
  return (
    <form
      className="grid gap-4 rounded-tile border border-border bg-raised p-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(d);
      }}
    >
      <Field label="Text" required className="md:col-span-2">
        {(c) => (
          <Textarea
            {...c}
            rows={3}
            maxLength={1000}
            value={d.text}
            onChange={(e) => setD({ ...d, text: e.target.value })}
          />
        )}
      </Field>
      {kind === "scripture" ? (
        <>
          <Field label="Reference" required hint="e.g. John 15:12">
            {(c) => (
              <Input
                {...c}
                value={d.reference}
                maxLength={80}
                onChange={(e) => setD({ ...d, reference: e.target.value })}
              />
            )}
          </Field>
          <Field label="Translation">
            {(c) => (
              <Input
                {...c}
                value={d.translation}
                maxLength={12}
                onChange={(e) => setD({ ...d, translation: e.target.value })}
              />
            )}
          </Field>
        </>
      ) : (
        <Field
          label="Attribution"
          hint={kind === "romance" ? "Poet and poem" : "Optional"}
          className="md:col-span-2"
        >
          {(c) => (
            <Input
              {...c}
              value={d.attribution}
              maxLength={200}
              onChange={(e) => setD({ ...d, attribution: e.target.value })}
            />
          )}
        </Field>
      )}
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" size="sm" disabled={pending || !d.text.trim()}>
          {d.id ? "Save" : "Add"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
