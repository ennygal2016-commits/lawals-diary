"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { Globe, Lock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, TitleInput } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES, type Category, type Mood } from "@/lib/moods";
import type { RichDoc } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import { LOCATION_MAX, TITLE_MAX, type EntryInput } from "@/lib/validation/entry";
import { autosaveDraft, saveEntry } from "@/server/actions/entries";
import type { Visibility } from "@/types/database";
import { MoodPicker } from "./mood-picker";
import { type AttachedPhoto, PhotoField } from "./photo-field";
import { RichTextEditor } from "./rich-text-editor";

export type EntryFormValues = {
  title: string;
  entry_date: string;
  location: string;
  mood: Mood | null;
  category: Category;
  visibility: Visibility;
  body_json: RichDoc;
  photos: AttachedPhoto[];
};

type SaveState =
  | { kind: "idle" }
  | { kind: "unsaved" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "needs-title" }
  | { kind: "error"; message: string };

/** Autosave cadence (PRD FR-15): at most every 5 s while changes keep coming, and on blur. */
export const AUTOSAVE_MS = 5000;

function toInput(values: EntryFormValues, id: string | undefined): EntryInput {
  return {
    id,
    title: values.title,
    entry_date: values.entry_date,
    location: values.location,
    mood: values.mood,
    category: values.category,
    visibility: values.visibility,
    body_json: values.body_json,
    photo_ids: values.photos.map((p) => p.id),
  };
}

function clock(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
}

/**
 * New / edit entry (PRD §5.3, Nocturne "New entry · phone"). Drafts autosave; a published entry only changes when
 * Save entry is pressed. The close X asks before throwing away unsaved changes.
 */
export function EntryForm({
  entryId: initialId,
  status,
  initial,
  lastSavedAt,
  maxDate,
  closeHref,
}: {
  entryId?: string;
  status: "new" | "draft" | "published";
  initial: EntryFormValues;
  lastSavedAt?: string;
  maxDate: string;
  closeHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const autosaves = status !== "published";

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    watch,
    formState: { errors },
  } = useForm<EntryFormValues>({ defaultValues: initial });

  const idRef = React.useRef(initialId);
  const version = React.useRef(0);
  const savedVersion = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = React.useRef<Promise<void> | null>(null);
  const publishing = React.useRef(false);
  const [saveState, setSaveState] = React.useState<SaveState>(
    lastSavedAt && autosaves ? { kind: "saved", at: lastSavedAt } : { kind: "idle" },
  );
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const isDirty = () => version.current !== savedVersion.current;

  const runAutosave = React.useCallback(async (): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!autosaves || publishing.current || !isDirty()) return;
    if (inFlight.current) {
      await inFlight.current;
      return runAutosave();
    }
    const v = version.current;
    const task = (async () => {
      setSaveState({ kind: "saving" });
      let result: Awaited<ReturnType<typeof autosaveDraft>>;
      try {
        result = await autosaveDraft(toInput(getValues(), idRef.current));
      } catch {
        // Offline or the server didn't answer: say so; the next change (or blur) tries again.
        setSaveState({ kind: "error", message: "Couldn’t save — check your connection" });
        return;
      }
      if (result.ok) {
        const first = !idRef.current;
        idRef.current = result.id;
        savedVersion.current = v;
        // A new entry becomes a draft: keep editing it at its own URL (reload-safe).
        if (first) window.history.replaceState(null, "", `/admin/entries/${result.id}/edit`);
        setSaveState(isDirty() ? { kind: "unsaved" } : { kind: "saved", at: result.savedAt });
      } else if (result.reason === "needs-title") {
        setSaveState({ kind: "needs-title" });
      } else {
        setSaveState({ kind: "error", message: result.message });
      }
    })();
    inFlight.current = task;
    try {
      await task;
    } finally {
      inFlight.current = null;
    }
    // Changes that arrived while saving get their own save.
    if (isDirty() && !timer.current && !publishing.current) {
      timer.current = setTimeout(() => void runAutosave(), AUTOSAVE_MS);
    }
  }, [autosaves, getValues]);

  // Every change bumps the version and (for drafts) schedules a save within 5 s.
  React.useEffect(() => {
    const sub = watch(() => {
      version.current += 1;
      setSaveState((s) => (s.kind === "saving" ? s : { kind: "unsaved" }));
      if (autosaves && !timer.current && !publishing.current) {
        timer.current = setTimeout(() => void runAutosave(), AUTOSAVE_MS);
      }
    });
    return () => sub.unsubscribe();
  }, [watch, autosaves, runAutosave]);

  React.useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (isDirty() && !publishing.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onBlurSave = () => {
    if (autosaves && isDirty()) void runAutosave();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!values.title.trim()) {
      setError("title", { message: "Give the day a name." });
      return;
    }
    publishing.current = true;
    if (timer.current) clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    setSubmitting(true);
    const result = await saveEntry(toInput(values, idRef.current));
    if (!result.ok) {
      publishing.current = false;
      setSubmitting(false);
      for (const [key, message] of Object.entries(result.fieldErrors ?? {})) {
        const field = key === "photo_ids" ? "photos" : key;
        setError(field as keyof EntryFormValues, { message });
      }
      toast({ title: result.message, variant: "danger" });
      return;
    }
    savedVersion.current = version.current;
    toast({ title: status === "published" ? "Entry saved." : "Entry saved to the diary." });
    router.push(`/admin/entries/${result.id}`);
    router.refresh();
  });

  function close() {
    if (isDirty()) setConfirmClose(true);
    else router.push(closeHref);
  }

  function discard() {
    publishing.current = true; // stop autosave
    savedVersion.current = version.current;
    setConfirmClose(false);
    router.push(closeHref);
  }

  const visibility = watch("visibility");

  return (
    <form
      onSubmit={onSubmit}
      onBlur={onBlurSave}
      noValidate
      className="flex min-h-[calc(100dvh-8rem)] flex-col"
    >
      <div className="flex flex-col gap-7 md:gap-8">
        <div className="flex items-center justify-between gap-4">
          <Button variant="subtle" size="icon" aria-label="Close" onClick={close}>
            <X aria-hidden />
          </Button>
          <SaveIndicator state={saveState} autosaves={autosaves} />
        </div>

        <Field label="Title" required error={errors.title?.message}>
          {(control) => (
            <TitleInput
              {...control}
              placeholder="Give the day a name"
              maxLength={TITLE_MAX}
              autoComplete="off"
              defaultValue={initial.title}
              {...register("title")}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3 md:gap-5">
          <Field label="Date" error={errors.entry_date?.message}>
            {(control) => (
              <Input
                {...control}
                type="date"
                max={maxDate}
                defaultValue={initial.entry_date}
                {...register("entry_date")}
              />
            )}
          </Field>
          <Field label="Location" error={errors.location?.message}>
            {(control) => (
              <Input
                {...control}
                placeholder="Where were you?"
                maxLength={LOCATION_MAX}
                autoComplete="off"
                defaultValue={initial.location ?? ""}
                {...register("location")}
              />
            )}
          </Field>
        </div>

        <FieldGroup label="Mood" id="entry-mood-label">
          <Controller
            control={control}
            name="mood"
            render={({ field }) => (
              <MoodPicker value={field.value} onChange={field.onChange} labelId="entry-mood-label" />
            )}
          />
        </FieldGroup>

        <FieldGroup label="Category" id="entry-category-label">
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <div role="group" aria-labelledby="entry-category-label" className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c.value}
                    selected={field.value === c.value}
                    onClick={() => field.onChange(c.value)}
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
            )}
          />
        </FieldGroup>

        <FieldGroup label="Photos" id="entry-photos-label" error={errors.photos?.message}>
          <Controller
            control={control}
            name="photos"
            render={({ field }) => (
              <PhotoField value={field.value} onChange={field.onChange} labelId="entry-photos-label" />
            )}
          />
        </FieldGroup>

        <FieldGroup label="What happened?" id="entry-body-label">
          <Controller
            control={control}
            name="body_json"
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                onBlur={onBlurSave}
                labelId="entry-body-label"
              />
            )}
          />
        </FieldGroup>
      </div>

      {/* Sticky bottom bar: visibility + Save entry (DESIGN.md §4). */}
      <div className="sticky bottom-0 z-30 mt-8 -mx-5 flex items-center gap-3 border-t border-divider bg-bg/95 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:-mx-8 md:px-8">
        <Controller
          control={control}
          name="visibility"
          render={({ field }) => (
            <button
              type="button"
              onClick={() => field.onChange(field.value === "private" ? "public" : "private")}
              aria-describedby="visibility-hint"
              className={cn(
                "inline-flex h-14 shrink-0 items-center gap-2 rounded-btn-lg border px-5 text-[15px] font-medium transition-colors",
                field.value === "public"
                  ? "border-lavender bg-lavender-soft text-lavender-text"
                  : "border-border-strong bg-surface text-fg",
              )}
            >
              {field.value === "public" ? (
                <Globe aria-hidden className="size-[18px]" strokeWidth={1.75} />
              ) : (
                <Lock aria-hidden className="size-[18px]" strokeWidth={1.75} />
              )}
              {field.value === "public" ? "Public" : "Private"}
            </button>
          )}
        />
        <span id="visibility-hint" className="visually-hidden">
          {visibility === "public"
            ? "Public: shows on the public Journal once saved. Press to make it private."
            : "Private: only the two of you can see it. Press to make it public."}
        </span>
        <Button type="submit" size="lg" className="h-14 flex-1" disabled={submitting}>
          {submitting ? "Saving…" : "Save entry"}
        </Button>
      </div>

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              {autosaves && idRef.current
                ? "Your latest changes haven’t been saved yet. The draft keeps what was saved before."
                : "Your changes haven’t been saved."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={discard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function FieldGroup({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span id={id} className="eyebrow">
        {label}
      </span>
      {children}
      {error ? (
        <p role="alert" className="m-0 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SaveIndicator({ state, autosaves }: { state: SaveState; autosaves: boolean }) {
  let text = "";
  let tone = "text-muted";
  switch (state.kind) {
    case "saving":
      text = "Saving…";
      break;
    case "saved":
      text = `Draft saved · ${clock(state.at)}`;
      tone = "text-success";
      break;
    case "unsaved":
      text = autosaves ? "Unsaved changes" : "Unsaved changes — press Save entry";
      break;
    case "needs-title":
      text = "Add a title to save a draft";
      tone = "text-warning";
      break;
    case "error":
      text = state.message;
      tone = "text-danger";
      break;
    case "idle":
      text = autosaves ? "" : "Editing a published entry";
  }
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("m-0 flex items-center gap-2 font-mono text-[13px]", tone)}
    >
      {state.kind === "saved" ? (
        <span aria-hidden className="size-2 rounded-full bg-success shadow-glow" />
      ) : null}
      {text}
    </p>
  );
}
