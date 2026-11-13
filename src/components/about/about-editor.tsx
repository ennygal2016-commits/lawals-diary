"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, ImagePlus, Plus, Trash2, X } from "lucide-react";

import { RichTextEditor } from "@/components/entries/rich-text-editor";
import { type AttachedPhoto, PhotoPickerDialog } from "@/components/photos/photo-picker-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ABOUT_PHOTOS_MAX, type AboutDraft, MILESTONES_MAX, type Milestone } from "@/lib/about";
import { cn } from "@/lib/utils";
import { type AboutResult, publishAbout, saveAbout } from "@/server/actions/about";

export type AboutActions = {
  save: (d: AboutDraft) => Promise<AboutResult>;
  publish: (d: AboutDraft) => Promise<AboutResult>;
};
const serverActions: AboutActions = { save: saveAbout, publish: publishAbout };

/** /admin/about (PRD FR-39): hero photo, names, story, milestones and chosen photos, with Preview and Publish. */
export function AboutEditor({
  initial,
  thumbs: initialThumbs,
  publishedAt: initialPublishedAt,
  unpublishedChanges,
  previewHref = "/admin/about/preview",
  actions = serverActions,
}: {
  initial: AboutDraft;
  thumbs: Record<string, string | null>;
  publishedAt: string | null;
  unpublishedChanges: boolean;
  previewHref?: string;
  actions?: AboutActions;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = React.useState(initial);
  const [thumbs, setThumbs] = React.useState(initialThumbs);
  const [dirty, setDirty] = React.useState(false);
  const [changesToPublish, setChangesToPublish] = React.useState(unpublishedChanges);
  const [publishedAt, setPublishedAt] = React.useState(initialPublishedAt);
  const [confirmPublish, setConfirmPublish] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [picker, setPicker] = React.useState<
    null | { kind: "hero" } | { kind: "gallery" } | { kind: "milestone"; id: string }
  >(null);

  React.useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (change: Partial<AboutDraft>) => {
    setDraft((d) => ({ ...d, ...change }));
    setDirty(true);
    setChangesToPublish(true);
  };
  const updateMilestone = (id: string, change: Partial<Milestone>) =>
    update({ milestones: draft.milestones.map((m) => (m.id === id ? { ...m, ...change } : m)) });
  const move = (i: number, delta: -1 | 1) => {
    const next = [...draft.milestones];
    const [m] = next.splice(i, 1);
    next.splice(i + delta, 0, m!);
    update({ milestones: next });
  };

  function remember(photos: AttachedPhoto[]) {
    setThumbs((t) => ({ ...t, ...Object.fromEntries(photos.map((p) => [p.id, p.thumbUrl])) }));
  }

  function run(which: "save" | "publish", after?: () => void) {
    startTransition(async () => {
      const r = await actions[which](draft);
      toast({ title: r.message, variant: r.ok ? "default" : "danger" });
      if (!r.ok) return;
      setDirty(false);
      if (which === "publish") {
        setChangesToPublish(false);
        setPublishedAt(r.publishedAt ?? new Date().toISOString());
      }
      after?.();
      router.refresh();
    });
  }

  const status = publishedAt
    ? `Published ${new Intl.DateTimeFormat("en-CA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(publishedAt))}${changesToPublish ? " · unpublished changes" : ""}`
    : "Not published yet";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="page-title m-0">About Us</h1>
          <p className="m-0 font-mono text-[13px] text-muted uppercase" role="status" aria-live="polite">
            {status}
            {dirty ? " · draft not saved" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" disabled={pending} onClick={() => run("save")}>
            Save draft
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run("save", () => window.open(previewHref, "_blank", "noopener"))}
          >
            <Eye aria-hidden strokeWidth={1.75} />
            Preview
          </Button>
          <Button disabled={pending} onClick={() => setConfirmPublish(true)}>
            Publish
          </Button>
        </div>
      </div>

      <Panel title="Names and hero photo" id="about-hero">
        <Field label="Your names" hint="Shown large at the top: “Nurat & Afeez”.">
          {(c) => (
            <Input
              {...c}
              value={draft.couple_names}
              maxLength={80}
              onChange={(e) => update({ couple_names: e.target.value })}
            />
          )}
        </Field>
        <PhotoSlot
          label="Hero photo"
          url={draft.hero_photo_id ? (thumbs[draft.hero_photo_id] ?? null) : null}
          onChoose={() => setPicker({ kind: "hero" })}
          onRemove={draft.hero_photo_id ? () => update({ hero_photo_id: null }) : undefined}
          wide
        />
      </Panel>

      <Panel title="Our story" id="about-story">
        <p className="m-0 -mt-2 text-[14px] text-muted">
          The first paragraph is shown large, like an opening line.
        </p>
        <span id="about-story-label" className="visually-hidden">
          Our story
        </span>
        <RichTextEditor
          value={draft.story_json}
          onChange={(doc) => update({ story_json: doc })}
          labelId="about-story-label"
          placeholder="Where you met, the first thing you noticed about each other…"
        />
      </Panel>

      <Panel title="Milestones" id="about-milestones">
        {draft.milestones.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No milestones yet.</p>
        ) : null}
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {draft.milestones.map((m, i) => (
            <li
              key={m.id}
              className="flex flex-col gap-4 rounded-tile border border-border bg-raised p-4"
              aria-label={`Milestone ${i + 1}`}
            >
              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <Field label="Date">
                  {(c) => (
                    <Input
                      {...c}
                      type="date"
                      value={m.date}
                      onChange={(e) => updateMilestone(m.id, { date: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Title">
                  {(c) => (
                    <Input
                      {...c}
                      value={m.title}
                      maxLength={80}
                      onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                    />
                  )}
                </Field>
              </div>
              <Field label="A short line">
                {(c) => (
                  <Textarea
                    {...c}
                    rows={2}
                    maxLength={300}
                    value={m.text}
                    onChange={(e) => updateMilestone(m.id, { text: e.target.value })}
                  />
                )}
              </Field>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <PhotoSlot
                  label="Photo (optional)"
                  url={m.photo_id ? (thumbs[m.photo_id] ?? null) : null}
                  onChoose={() => setPicker({ kind: "milestone", id: m.id })}
                  onRemove={m.photo_id ? () => updateMilestone(m.id, { photo_id: null }) : undefined}
                />
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Move milestone ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Move milestone ${i + 1} down`}
                    disabled={i === draft.milestones.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove milestone ${i + 1}`}
                    onClick={() => update({ milestones: draft.milestones.filter((x) => x.id !== m.id) })}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div>
          <Button
            variant="secondary"
            disabled={draft.milestones.length >= MILESTONES_MAX}
            onClick={() =>
              update({
                milestones: [
                  ...draft.milestones,
                  {
                    id: crypto.randomUUID(),
                    date: new Date().toISOString().slice(0, 10),
                    title: "",
                    text: "",
                    photo_id: null,
                  },
                ],
              })
            }
          >
            <Plus aria-hidden strokeWidth={1.75} />
            Add a milestone
          </Button>
        </div>
        <p className="m-0 text-[13px] text-faint">Milestones are shown in date order on the public page.</p>
      </Panel>

      <Panel title="Photos for the page" id="about-photos">
        <p className="m-0 -mt-2 text-[14px] text-muted">
          These, the hero photo and milestone photos become public when you publish. Up to {ABOUT_PHOTOS_MAX}.
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
          {draft.photo_ids.map((id, i) => (
            <li key={id} className="relative size-24 overflow-hidden rounded-tile bg-placeholder-tint">
              {thumbs[id] ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                <img src={thumbs[id]!} alt={`Chosen photo ${i + 1}`} className="size-full object-cover" />
              ) : null}
              <button
                type="button"
                aria-label={`Remove chosen photo ${i + 1}`}
                onClick={() => update({ photo_ids: draft.photo_ids.filter((x) => x !== id) })}
                className="absolute top-1 right-1 inline-flex size-7 items-center justify-center rounded-full bg-[rgba(14,12,20,0.7)] text-fg"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setPicker({ kind: "gallery" })}
              disabled={draft.photo_ids.length >= ABOUT_PHOTOS_MAX}
              className="flex size-24 flex-col items-center justify-center gap-1 rounded-tile border border-dashed border-border-dashed text-[13px] text-fg-soft hover:text-fg disabled:opacity-50"
            >
              <ImagePlus aria-hidden className="size-5" strokeWidth={1.75} />
              Add photos
            </button>
          </li>
        </ul>
      </Panel>

      <PhotoPickerDialog
        open={picker !== null}
        onOpenChange={(o) => (o ? null : setPicker(null))}
        title={picker?.kind === "gallery" ? "Choose photos for the page" : "Choose a photo"}
        attached={
          picker?.kind === "gallery"
            ? draft.photo_ids.map((id) => ({ id, thumbUrl: thumbs[id] ?? null }))
            : []
        }
        room={picker?.kind === "gallery" ? ABOUT_PHOTOS_MAX - draft.photo_ids.length : 1}
        onAdd={(photos) => {
          remember(photos);
          if (!picker) return;
          if (picker.kind === "hero") update({ hero_photo_id: photos[0]?.id ?? null });
          else if (picker.kind === "milestone")
            updateMilestone(picker.id, { photo_id: photos[0]?.id ?? null });
          else update({ photo_ids: [...draft.photo_ids, ...photos.map((p) => p.id)] });
        }}
      />

      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Publish the About page?</DialogTitle>
            <DialogDescription>
              Anyone can see the public site. The photos you chose become public; photos you removed since the
              last publish go private again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmPublish(false)}>
              Not yet
            </Button>
            <Button disabled={pending} onClick={() => run("publish", () => setConfirmPublish(false))}>
              {pending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Panel({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 md:p-7"
    >
      <h2 id={id} className="serif m-0 text-[26px] leading-none">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PhotoSlot({
  label,
  url,
  onChoose,
  onRemove,
  wide = false,
}: {
  label: string;
  url: string | null;
  onChoose: () => void;
  onRemove?: () => void;
  wide?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn("overflow-hidden rounded-tile bg-placeholder-tint", wide ? "h-28 w-48" : "size-20")}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img src={url} alt="" className="size-full object-cover" />
          ) : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onChoose}
          aria-label={`${url ? "Change" : "Choose"} ${label.toLowerCase()}`}
        >
          {url ? "Change" : "Choose"}
        </Button>
        {onRemove ? (
          <Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Remove ${label.toLowerCase()}`}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
