"use client";

import * as React from "react";

import type { PhotoActions } from "@/components/photos/photo-actions";
import { PhotoLibrary } from "@/components/photos/photo-library";
import type { PhotoFilter } from "@/lib/photos";
import type { PhotoDetail } from "@/server/actions/photos";
import type { LibraryPhoto } from "@/server/queries/photo-library";

const TINTS = ["#7ec8e0", "#ff8a9b", "#b9a6ff", "#ffc98a", "#7ee0b5", "#d6a3c9", "#6f8fd1"];

function svg(i: number, size: number) {
  const tint = TINTS[i % TINTS.length]!;
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 0.75)}"><rect width="100%" height="100%" fill="${tint}"/><circle cx="70%" cy="35%" r="${size / 8}" fill="#fff" opacity=".55"/><text x="8%" y="88%" font-family="monospace" font-size="${size / 10}" fill="#0e0c14">#${i + 1}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(body)}`;
}

/** 64 sample photos so infinite scroll has something to load. */
const ALL: LibraryPhoto[] = Array.from({ length: 64 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  thumbUrl: svg(i, 400),
  caption: i % 5 === 0 ? `Sample photo ${i + 1}` : null,
  width: 1600,
  height: 1200,
  inGallery: i % 4 === 0,
  onAbout: i % 9 === 0,
  inPublicEntry: i % 7 === 0,
  isPublic: i % 4 === 0 || i % 9 === 0 || i % 7 === 0,
}));

const PAGE = 40;

function matches(p: LibraryPhoto, filter: PhotoFilter) {
  switch (filter) {
    case "gallery":
      return p.inGallery;
    case "about":
      return p.onAbout;
    case "public-entries":
      return p.inPublicEntry;
    case "private":
      return !p.isPublic;
    default:
      return true;
  }
}

export function PhotosPreview({ filter }: { filter: PhotoFilter }) {
  const store = React.useRef(ALL.map((p) => ({ ...p })));

  const actions: PhotoActions = React.useMemo(
    () => ({
      listPhotos: async (f, offset) => {
        const list = store.current.filter((p) => matches(p, f));
        return { photos: list.slice(offset, offset + PAGE), more: list.length > offset + PAGE };
      },
      getPhotoDetail: async (id) => {
        const p = store.current.find((x) => x.id === id);
        if (!p) return null;
        const i = store.current.indexOf(p);
        return {
          id: p.id,
          caption: p.caption,
          createdAt: new Date(Date.UTC(2026, 10, 3) - i * 86_400_000).toISOString(),
          width: p.width,
          height: p.height,
          inGallery: p.inGallery,
          onAbout: p.onAbout,
          inPublicEntry: p.inPublicEntry,
          isPublic: p.isPublic,
          urls: { webp: svg(i, 1200), jpeg: svg(i, 1200), webp2400: null },
          entries: p.inPublicEntry
            ? [
                {
                  id: "sample-entry",
                  title: "The long walk along the lake",
                  visibility: "public",
                  status: "published",
                },
              ]
            : [],
        } satisfies PhotoDetail;
      },
      updatePhoto: async (input) => {
        const p = store.current.find((x) => x.id === input.id);
        if (!p) return { ok: false, message: "Not found." };
        if (input.caption !== undefined) p.caption = input.caption || null;
        if (input.in_gallery !== undefined) p.inGallery = input.in_gallery;
        if (input.on_about !== undefined) p.onAbout = input.on_about;
        p.isPublic = p.inGallery || p.onAbout || p.inPublicEntry;
        return {
          ok: true,
          message: input.caption !== undefined ? "Caption saved." : "Updated.",
          photo: { caption: p.caption, inGallery: p.inGallery, onAbout: p.onAbout, isPublic: p.isPublic },
        };
      },
      deletePhoto: async (id) => {
        store.current = store.current.filter((p) => p.id !== id);
        return { ok: true, message: "Photo deleted." };
      },
    }),
    [],
  );

  const counts = React.useMemo(() => {
    const filters: PhotoFilter[] = ["all", "gallery", "about", "public-entries", "private"];
    return Object.fromEntries(filters.map((f) => [f, ALL.filter((p) => matches(p, f)).length])) as Record<
      PhotoFilter,
      number
    >;
  }, []);
  const first = ALL.filter((p) => matches(p, filter));

  return (
    <PhotoLibrary
      key={filter}
      filter={filter}
      initialPhotos={first.slice(0, PAGE)}
      initialMore={first.length > PAGE}
      initialCounts={counts}
      actions={actions}
    />
  );
}
