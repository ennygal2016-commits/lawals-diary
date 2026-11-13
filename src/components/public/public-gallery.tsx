"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryPhoto = { id: string; thumb: string; full: string; caption: string | null };

/**
 * Public photo grid + lightbox (gallery, journal entries): ← → and swipe between photos, Esc closes, captions.
 * Only ever given public copies.
 */
export function PublicGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = React.useState<number | null>(null);
  const swipe = React.useRef<number | null>(null);
  const photo = open === null ? null : photos[open];
  const go = (d: -1 | 1) =>
    setOpen((i) => (i === null ? i : Math.min(photos.length - 1, Math.max(0, i + d))));

  return (
    <>
      <ul
        aria-label="Photos"
        className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3"
      >
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open photo ${i + 1}${p.caption ? `: ${p.caption}` : ""}`}
              className="block aspect-square w-full overflow-hidden rounded-tile bg-placeholder-tint"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- public CDN copy */}
              <img
                src={p.thumb}
                alt=""
                loading={i < 6 ? "eager" : "lazy"}
                fetchPriority={i < 2 ? "high" : "auto"}
                decoding="async"
                className="size-full object-cover transition-transform hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      <DialogPrimitive.Root open={photo != null} onOpenChange={(o) => (o ? null : setOpen(null))}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(8,7,12,0.95)]" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") go(-1);
              if (e.key === "ArrowRight") go(1);
            }}
            onPointerDown={(e) => {
              if (e.pointerType !== "mouse") swipe.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (swipe.current === null) return;
              const dx = e.clientX - swipe.current;
              swipe.current = null;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            }}
            className="fixed inset-0 z-50 flex touch-pan-y flex-col items-center justify-center gap-4 p-4 outline-none md:p-10"
          >
            <DialogPrimitive.Title className="visually-hidden">
              Photo {open === null ? "" : open + 1} of {photos.length}
              {photo?.caption ? `: ${photo.caption}` : ""}
            </DialogPrimitive.Title>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- public CDN copy
              <img
                src={photo.full}
                alt={photo.caption ?? ""}
                className="max-h-[80dvh] max-w-full rounded-tile object-contain"
              />
            ) : null}
            {photo?.caption ? (
              <p className="m-0 max-w-[720px] text-center text-[15px] text-fg-soft">{photo.caption}</p>
            ) : null}
            <button
              type="button"
              aria-label="Previous photo"
              disabled={open === 0}
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(14,12,20,0.7)] text-fg disabled:opacity-0"
            >
              <ChevronLeft aria-hidden className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={open === photos.length - 1}
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(14,12,20,0.7)] text-fg disabled:opacity-0"
            >
              <ChevronRight aria-hidden className="size-6" />
            </button>
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute top-4 right-4 inline-flex size-11 items-center justify-center rounded-btn border border-border bg-[rgba(14,12,20,0.7)] text-fg"
            >
              <X aria-hidden className="size-5" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
