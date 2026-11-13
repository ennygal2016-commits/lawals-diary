"use client";

import * as React from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, Globe, Loader2, Lock, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { CAPTION_MAX } from "@/lib/photos";
import type { PhotoDetail } from "@/server/actions/photos";
import type { LibraryPhoto } from "@/server/queries/photo-library";
import { type PhotoActions, serverPhotoActions } from "./photo-actions";

const SWIPE_PX = 50;

/**
 * Lightbox (PRD FR-27): ← → and swipe between photos, Esc closes, caption, date, linked entries, the two public
 * toggles and delete.
 */
export function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  onChanged,
  onDeleted,
  canLoadMore,
  onLoadMore,
  actions = serverPhotoActions,
}: {
  photos: LibraryPhoto[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onChanged: (id: string, change: Partial<LibraryPhoto>) => void;
  onDeleted: (id: string) => void;
  canLoadMore: boolean;
  onLoadMore: () => Promise<void>;
  actions?: PhotoActions;
}) {
  const { toast } = useToast();
  const photo = index === null ? null : (photos[index] ?? null);
  const [detail, setDetail] = React.useState<PhotoDetail | null>(null);
  const [caption, setCaption] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const swipeStart = React.useRef<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setDetail(null);
    if (!photo) return;
    void actions.getPhotoDetail(photo.id).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setCaption(d?.caption ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [photo, actions]);

  const hasPrev = index !== null && index > 0;
  const hasNext = index !== null && (index < photos.length - 1 || canLoadMore);

  const go = React.useCallback(
    async (delta: -1 | 1) => {
      if (index === null) return;
      const target = index + delta;
      if (target < 0) return;
      if (target >= photos.length) {
        if (!canLoadMore) return;
        await onLoadMore();
      }
      onIndexChange(target);
    },
    [index, photos.length, canLoadMore, onLoadMore, onIndexChange],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    // Esc always closes the lightbox — even while a toast is showing (Radix would let the toast swallow the
    // first Esc). The delete confirmation handles its own Esc.
    if (event.key === "Escape" && !confirmDelete) {
      onClose();
      return;
    }
    // Arrow keys belong to the caption box while typing in it.
    if ((event.target as HTMLElement).closest("textarea, input")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      void go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      void go(1);
    }
  }

  async function toggle(field: "in_gallery" | "on_about", value: boolean) {
    if (!detail) return;
    setBusy(true);
    const result = await actions.updatePhoto({ id: detail.id, [field]: value });
    setBusy(false);
    toast({ title: result.message, variant: result.ok ? "default" : "danger" });
    if (result.ok) {
      setDetail({ ...detail, ...result.photo });
      onChanged(detail.id, result.photo);
    }
  }

  async function saveCaption(event: React.FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setBusy(true);
    const result = await actions.updatePhoto({ id: detail.id, caption });
    setBusy(false);
    toast({ title: result.message, variant: result.ok ? "default" : "danger" });
    if (result.ok) {
      setDetail({ ...detail, caption: result.photo.caption });
      onChanged(detail.id, { caption: result.photo.caption });
    }
  }

  async function remove() {
    if (!detail) return;
    setBusy(true);
    const result = await actions.deletePhoto(detail.id);
    setBusy(false);
    setConfirmDelete(false);
    toast({ title: result.message, variant: result.ok ? "default" : "danger" });
    if (result.ok) onDeleted(detail.id);
  }

  const position = index === null ? "" : `${index + 1} of ${photos.length}${canLoadMore ? "+" : ""}`;
  const added = detail
    ? new Intl.DateTimeFormat("en-CA", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(detail.createdAt))
    : "";

  return (
    <DialogPrimitive.Root open={photo !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(8,7,12,0.94)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col outline-none lg:flex-row"
        >
          <DialogPrimitive.Title className="visually-hidden">
            Photo {position}
            {detail?.caption ? `: ${detail.caption}` : ""}
          </DialogPrimitive.Title>

          {/* Image stage */}
          <div
            className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center p-4 select-none lg:p-10"
            onPointerDown={(e) => {
              if (e.pointerType !== "mouse") swipeStart.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (swipeStart.current === null) return;
              const dx = e.clientX - swipeStart.current;
              swipeStart.current = null;
              if (Math.abs(dx) > SWIPE_PX) void go(dx < 0 ? 1 : -1);
            }}
            onPointerCancel={() => (swipeStart.current = null)}
          >
            {detail?.urls.webp || detail?.urls.jpeg ? (
              <picture className="contents">
                {detail.urls.webp ? <source type="image/webp" srcSet={detail.urls.webp} /> : null}
                <img
                  src={detail.urls.jpeg ?? detail.urls.webp ?? ""}
                  alt={detail.caption ?? "Photo"}
                  draggable={false}
                  className="max-h-full max-w-full rounded-tile object-contain"
                />
              </picture>
            ) : photo?.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- placeholder while the large size loads
              <img
                src={photo.thumbUrl}
                alt=""
                className="max-h-full max-w-full object-contain opacity-60 blur-sm"
              />
            ) : (
              <Loader2 aria-hidden className="size-6 animate-spin text-muted" />
            )}

            <button
              type="button"
              aria-label="Previous photo"
              disabled={!hasPrev}
              onClick={() => void go(-1)}
              className="absolute top-1/2 left-3 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(14,12,20,0.7)] text-fg backdrop-blur disabled:opacity-0 lg:left-6"
            >
              <ChevronLeft aria-hidden className="size-6" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={!hasNext}
              onClick={() => void go(1)}
              className="absolute top-1/2 right-3 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(14,12,20,0.7)] text-fg backdrop-blur disabled:opacity-0 lg:right-6"
            >
              <ChevronRight aria-hidden className="size-6" strokeWidth={1.75} />
            </button>
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-btn border border-border bg-[rgba(14,12,20,0.7)] text-fg backdrop-blur lg:top-6 lg:right-6"
            >
              <X aria-hidden className="size-5" />
            </DialogPrimitive.Close>
            <span className="absolute top-5 left-4 font-mono text-[12px] text-muted lg:top-8 lg:left-8">
              {position}
            </span>
          </div>

          {/* Details */}
          <aside
            aria-label="Photo details"
            className="flex max-h-[45dvh] shrink-0 flex-col gap-5 overflow-y-auto border-t border-divider bg-surface p-5 lg:max-h-none lg:w-[360px] lg:border-t-0 lg:border-l lg:p-7"
          >
            {!detail ? (
              <p className="m-0 text-[14px] text-muted">Loading…</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[12px] text-muted uppercase">Added {added}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 font-mono text-[12px] uppercase",
                      detail.isPublic ? "text-lavender" : "text-muted",
                    )}
                  >
                    {detail.isPublic ? (
                      <Globe aria-hidden className="size-3.5" />
                    ) : (
                      <Lock aria-hidden className="size-3.5" />
                    )}
                    {detail.isPublic ? "Public" : "Private"}
                  </span>
                </div>

                <form onSubmit={saveCaption} className="flex flex-col gap-2">
                  <Field label="Caption">
                    {(control) => (
                      <Textarea
                        {...control}
                        rows={2}
                        maxLength={CAPTION_MAX}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Say something about this photo"
                      />
                    )}
                  </Field>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      disabled={busy || caption.trim() === (detail.caption ?? "")}
                    >
                      Save caption
                    </Button>
                  </div>
                </form>

                <div className="flex flex-col gap-4 border-t border-divider pt-5">
                  <Switch
                    label="Show in public gallery"
                    checked={detail.inGallery}
                    disabled={busy}
                    onCheckedChange={(v) => void toggle("in_gallery", v)}
                  />
                  <Switch
                    label="Use on About page"
                    checked={detail.onAbout}
                    disabled={busy}
                    onCheckedChange={(v) => void toggle("on_about", v)}
                  />
                  {detail.inPublicEntry ? (
                    <p className="m-0 text-[13px] text-muted">
                      Also public because it’s in a public entry. Make the entry private to hide it.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 border-t border-divider pt-5">
                  <h3 className="eyebrow m-0">{detail.entries.length === 1 ? "Entry" : "Entries"}</h3>
                  {detail.entries.length === 0 ? (
                    <p className="m-0 text-[14px] text-muted">Not in any entry.</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {detail.entries.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2 text-[15px]">
                          <Link href={`/admin/entries/${e.id}`} className="truncate">
                            {e.title}
                          </Link>
                          <span className="shrink-0 font-mono text-[11px] text-muted uppercase">
                            {e.status === "draft" ? "Draft" : e.visibility}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-auto border-t border-divider pt-5">
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                    <Trash2 aria-hidden strokeWidth={1.75} />
                    Delete photo
                  </Button>
                </div>
              </>
            )}
          </aside>

          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent className="max-w-[440px]">
              <DialogHeader>
                <DialogTitle>Delete this photo?</DialogTitle>
                <DialogDescription>
                  It’s removed for good — from the library, every entry and the public site.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Keep it
                </Button>
                <Button variant="danger" onClick={() => void remove()} disabled={busy}>
                  {busy ? "Deleting…" : "Delete photo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
