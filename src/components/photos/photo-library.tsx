"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";

import { PageHeader } from "@/components/shell/page";
import { VisibilityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { SegmentedFilter } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { PHOTO_INPUT_ACCEPT } from "@/lib/images/accept";
import { cn } from "@/lib/utils";
import { PHOTO_FILTERS, type PhotoFilter } from "@/lib/photos";
import type { LibraryPhoto } from "@/server/queries/photo-library";
import { Lightbox } from "./lightbox";
import { type PhotoActions, serverPhotoActions } from "./photo-actions";
import { UploadQueue } from "./upload-queue";
import { type UploadedPhoto, usePhotoUploads } from "./use-photo-uploads";

/** Which filters a brand-new upload belongs to (new photos are private and in nothing). */
const NEW_PHOTO_FILTERS: PhotoFilter[] = ["all", "private"];

/**
 * /admin/photos (PRD FR-23–FR-27): Upload (button, multi-select, drag and drop anywhere on the page) with per-file
 * progress, filter chips with counts, the count, a square grid (5 / 3 / 2 columns) with visibility badges,
 * infinite scroll and the lightbox.
 */
export function PhotoLibrary({
  filter,
  initialPhotos,
  initialMore,
  initialCounts,
  actions = serverPhotoActions,
}: {
  filter: PhotoFilter;
  initialPhotos: LibraryPhoto[];
  initialMore: boolean;
  initialCounts: Record<PhotoFilter, number>;
  actions?: PhotoActions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [photos, setPhotos] = React.useState(initialPhotos);
  const [more, setMore] = React.useState(initialMore);
  const [counts, setCounts] = React.useState(initialCounts);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState<number | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const sentinel = React.useRef<HTMLDivElement>(null);
  const loadingRef = React.useRef(false);

  const uploads = usePhotoUploads({
    onUploaded: (p: UploadedPhoto) => {
      setCounts((c) => ({ ...c, all: c.all + 1, private: c.private + 1 }));
      if (!NEW_PHOTO_FILTERS.includes(filter)) return;
      setPhotos((list) => [
        {
          id: p.id,
          thumbUrl: p.thumbUrl,
          caption: null,
          width: p.width,
          height: p.height,
          inGallery: false,
          onAbout: false,
          inPublicEntry: false,
          isPublic: false,
        },
        ...list,
      ]);
    },
  });

  const loadMore = React.useCallback(async () => {
    if (loadingRef.current || !more) return;
    loadingRef.current = true;
    setLoading(true);
    const next = await actions.listPhotos(filter, photos.length);
    setPhotos((list) => {
      const seen = new Set(list.map((p) => p.id));
      return [...list, ...next.photos.filter((p) => !seen.has(p.id))];
    });
    setMore(next.more);
    setLoading(false);
    loadingRef.current = false;
  }, [filter, more, photos.length, actions]);

  // Infinite scroll: load the next page when the sentinel comes into view.
  React.useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, more]);

  // Drag and drop anywhere on the page.
  React.useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      uploads.add(Array.from(e.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [uploads]);

  function changeFilter(next: PhotoFilter) {
    router.push(next === "all" ? pathname : `${pathname}?filter=${next}`, { scroll: false });
  }

  function onChanged(id: string, change: Partial<LibraryPhoto>) {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)));
    // Counts for the chips depend on the flags — refresh them from the server.
    router.refresh();
  }

  function onDeleted(id: string) {
    const index = photos.findIndex((p) => p.id === id);
    const remaining = photos.filter((p) => p.id !== id);
    setPhotos(remaining);
    setCounts((c) => ({ ...c, all: Math.max(0, c.all - 1) }));
    setOpen(remaining.length === 0 ? null : Math.min(index, remaining.length - 1));
    router.refresh();
  }

  // Server-refreshed counts replace the local estimate.
  React.useEffect(() => setCounts(initialCounts), [initialCounts]);

  const total = counts[filter];
  const filterLabel = PHOTO_FILTERS.find((f) => f.value === filter)?.label ?? "All";

  return (
    <>
      <PageHeader
        title="Photos"
        actions={
          <Button onClick={() => fileInput.current?.click()}>
            <ImagePlus aria-hidden strokeWidth={1.75} />
            Upload
          </Button>
        }
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={PHOTO_INPUT_ACCEPT}
        className="visually-hidden"
        tabIndex={-1}
        aria-label="Upload photos"
        data-testid="photos-file"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          uploads.add(files);
        }}
      />
      <p className="-mt-3 mb-0 text-[14px] text-muted md:-mt-5">
        JPEG, PNG, WebP or HEIC up to 25 MB — drop them anywhere on this page. Location data is removed on
        upload.
      </p>

      <UploadQueue items={uploads.items} onDismiss={uploads.dismiss} onClear={uploads.clearFinished} />

      <div className="flex flex-col gap-3">
        <SegmentedFilter
          label="Show photos"
          options={PHOTO_FILTERS.map((f) => ({ value: f.value, label: f.label, count: counts[f.value] }))}
          value={filter}
          onValueChange={changeFilter}
        />
        <p className="m-0 font-mono text-[13px] text-muted" aria-live="polite">
          {total} {total === 1 ? "photo" : "photos"}
          {filter === "all" ? "" : ` · ${filterLabel.toLowerCase()}`}
        </p>
      </div>

      {photos.length === 0 && !more ? (
        <EmptyState
          variant="dashed"
          message={
            filter === "all" ? "No photos yet. Upload a few to start the library." : "No photos here yet."
          }
          action={
            filter === "all" ? (
              <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                Upload photos
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul
          aria-label="Photo library"
          className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3"
        >
          {photos.map((photo, i) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`Open photo ${i + 1}${photo.caption ? `: ${photo.caption}` : ""} (${photo.isPublic ? "public" : "private"})`}
                className="group relative block aspect-square w-full overflow-hidden rounded-tile bg-placeholder-tint"
              >
                {photo.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                  <img
                    src={photo.thumbUrl}
                    alt=""
                    // The first rows are on screen at once: load them right away (they're the page's LCP).
                    loading={i < 6 ? "eager" : "lazy"}
                    fetchPriority={i < 2 ? "high" : "auto"}
                    decoding="async"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : null}
                <VisibilityBadge
                  visibility={photo.isPublic ? "public" : "private"}
                  variant="icon"
                  className="absolute top-2 right-2"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinel} aria-hidden className="h-px" />
      {more ? (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => void loadMore()} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      <div
        aria-hidden={!dragging}
        className={cn(
          "pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(14,12,20,0.82)] backdrop-blur-sm transition-opacity",
          dragging ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="rounded-panel border-2 border-dashed border-accent px-10 py-8 text-center">
          <p className="serif m-0 text-[32px]">Drop to upload</p>
          <p className="m-0 mt-1 text-[14px] text-muted">Location data is removed on upload.</p>
        </div>
      </div>

      <Lightbox
        photos={photos}
        index={open}
        onIndexChange={setOpen}
        onClose={() => setOpen(null)}
        onChanged={onChanged}
        onDeleted={onDeleted}
        canLoadMore={more}
        onLoadMore={loadMore}
        actions={actions}
      />
    </>
  );
}
