"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { listLibraryPhotos } from "@/server/actions/entries";
import type { PhotoThumb } from "@/server/queries/photos";

export type AttachedPhoto = Pick<PhotoThumb, "id" | "thumbUrl">;

/** Pick photos from the library (entry form, About Us editor). Already-attached photos are shown but disabled. */
export function PhotoPickerDialog({
  open,
  onOpenChange,
  attached,
  room,
  onAdd,
  title = "From your library",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attached: AttachedPhoto[];
  room: number;
  onAdd: (photos: AttachedPhoto[]) => void;
  title?: string;
}) {
  const [photos, setPhotos] = React.useState<PhotoThumb[]>([]);
  const [more, setMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const attachedIds = new Set(attached.map((p) => p.id));

  const load = React.useCallback(async (offset: number) => {
    setLoading(true);
    const result = await listLibraryPhotos(offset);
    setPhotos((prev) => (offset === 0 ? result.photos : [...prev, ...result.photos]));
    setMore(result.more);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (open) {
      setSelected([]);
      void load(0);
    }
  }, [open, load]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < room ? [...s, id] : s));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {room > 0 ? `Choose up to ${room} more.` : `No more photos can be added here.`}
          </DialogDescription>
        </DialogHeader>

        {photos.length === 0 && !loading ? (
          <p className="m-0 text-[15px] text-muted">No photos yet. Upload some first.</p>
        ) : (
          <ul className="m-0 grid max-h-[50dvh] list-none grid-cols-3 gap-2 overflow-y-auto p-0 sm:grid-cols-4">
            {photos.map((photo, i) => {
              const isAttached = attachedIds.has(photo.id);
              const isSelected = selected.includes(photo.id);
              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isAttached}
                    aria-label={`Library photo ${i + 1}${isAttached ? " (already attached)" : ""}`}
                    onClick={() => toggle(photo.id)}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-tile bg-placeholder-tint",
                      isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                      isAttached && "opacity-40",
                    )}
                  >
                    {photo.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                      <img src={photo.thumbUrl} alt="" className="size-full object-cover" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {more ? (
          <Button variant="ghost" onClick={() => load(photos.length)} disabled={loading}>
            Load more
          </Button>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              onAdd(
                selected
                  .map((id) => photos.find((p) => p.id === id))
                  .filter((p): p is PhotoThumb => Boolean(p))
                  .map((p) => ({ id: p.id, thumbUrl: p.thumbUrl })),
              );
              onOpenChange(false);
            }}
          >
            {selected.length
              ? `Add ${selected.length} ${selected.length === 1 ? "photo" : "photos"}`
              : "Add photos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
