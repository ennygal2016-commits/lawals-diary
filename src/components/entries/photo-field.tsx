"use client";

import * as React from "react";
import { ImagePlus, Images, Loader2, Plus, X } from "lucide-react";

import { PhotoPickerDialog as LibraryDialog } from "@/components/photos/photo-picker-dialog";
import { usePhotoUploads } from "@/components/photos/use-photo-uploads";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { PHOTO_INPUT_ACCEPT } from "@/lib/images/accept";
import { cn } from "@/lib/utils";
import { PHOTOS_MAX } from "@/lib/validation/entry";
import type { PhotoThumb } from "@/server/queries/photos";

export type AttachedPhoto = Pick<PhotoThumb, "id" | "thumbUrl">;

/**
 * Photos (PRD FR-13/FR-23): 0–20, attached by upload (button, multi-select or drop on the field) or from the
 * library. Uploads go through /api/photos/upload — sniffed, HEIC converted, location data stripped — one file per
 * request with its own progress. The first photo is the cover.
 */
export function PhotoField({
  value,
  onChange,
  labelId,
}: {
  value: AttachedPhoto[];
  onChange: (photos: AttachedPhoto[]) => void;
  labelId: string;
}) {
  const { toast } = useToast();
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [dropping, setDropping] = React.useState(false);

  // Uploads finish after re-renders; always append to the latest list.
  const valueRef = React.useRef(value);
  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const uploads = usePhotoUploads({
    onUploaded: (photo) => {
      if (valueRef.current.length >= PHOTOS_MAX) return;
      const next = [...valueRef.current, { id: photo.id, thumbUrl: photo.thumbUrl }];
      valueRef.current = next;
      onChange(next);
    },
  });
  const { items, dismiss } = uploads;
  const inProgress = items.filter((i) => i.status !== "done" && i.status !== "error");
  const room = PHOTOS_MAX - value.length - inProgress.length;

  // Finished uploads leave the field; failures are announced once.
  React.useEffect(() => {
    for (const item of items) {
      if (item.status === "error")
        toast({ title: `${item.name}: ${item.message ?? "Couldn’t upload."}`, variant: "danger" });
      if (item.status === "error" || item.status === "done") dismiss(item.key);
    }
  }, [items, dismiss, toast]);

  function add(files: File[]) {
    if (files.length === 0) return;
    if (files.length > room) toast({ title: `Up to ${PHOTOS_MAX} photos per entry.`, variant: "danger" });
    uploads.add(files, room);
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-tile transition-colors",
        dropping && "bg-accent-soft outline-2 outline-offset-4 outline-accent outline-dashed",
      )}
      role="group"
      aria-labelledby={labelId}
      aria-describedby="photo-field-hint"
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          setDropping(true);
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDropping(false);
        add(Array.from(e.dataTransfer.files));
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={room <= 0}
          className="flex size-[84px] flex-col items-center justify-center gap-1 rounded-tile border border-dashed border-border-dashed text-[13px] text-fg-soft transition-colors hover:border-fg-soft hover:text-fg disabled:opacity-50 md:size-24"
          aria-label="Add photos"
        >
          <Plus aria-hidden className="size-5" strokeWidth={1.75} />
          Photos
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <ImagePlus strokeWidth={1.75} />
            Upload photos
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setLibraryOpen(true)}>
            <Images strokeWidth={1.75} />
            From your library
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInput}
        type="file"
        accept={PHOTO_INPUT_ACCEPT}
        multiple
        className="visually-hidden"
        tabIndex={-1}
        aria-label="Upload photos"
        data-testid="entry-photo-file"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          add(files);
        }}
      />

      {value.length + inProgress.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
          {value.map((photo, i) => (
            <li
              key={photo.id}
              className="relative size-[84px] overflow-hidden rounded-tile bg-placeholder-tint md:size-24"
            >
              {photo.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not optimisable
                <img
                  src={photo.thumbUrl}
                  alt={`Photo ${i + 1}${i === 0 ? " (cover)" : ""}`}
                  className="size-full object-cover"
                />
              ) : null}
              {i === 0 ? (
                <span className="absolute bottom-1 left-1 rounded-full bg-[rgba(14,12,20,0.7)] px-1.5 font-mono text-[10px] text-fg uppercase">
                  Cover
                </span>
              ) : null}
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => onChange(value.filter((p) => p.id !== photo.id))}
                className="absolute top-1 right-1 inline-flex size-7 items-center justify-center rounded-full bg-[rgba(14,12,20,0.7)] text-fg hover:bg-bg"
              >
                <X aria-hidden className="size-3.5" strokeWidth={2} />
              </button>
            </li>
          ))}
          {inProgress.map((item) => (
            <li
              key={item.key}
              className="flex size-[84px] flex-col items-center justify-center gap-1 rounded-tile bg-placeholder-tint md:size-24"
            >
              <Loader2 aria-hidden className="size-5 animate-spin text-muted" />
              <span
                role="progressbar"
                aria-label={`Uploading ${item.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.progress}
                className="font-mono text-[11px] text-muted"
              >
                {item.status === "processing" ? "Cleaning…" : `${item.progress}%`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p
        id="photo-field-hint"
        className="m-0 font-mono text-[12px] leading-relaxed text-muted"
        aria-live="polite"
      >
        {value.length} / {PHOTOS_MAX}
        <br />
        Location data is removed on upload
      </p>

      <LibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        attached={value}
        room={PHOTOS_MAX - value.length}
        onAdd={(photos) => onChange([...value, ...photos])}
      />
    </div>
  );
}
