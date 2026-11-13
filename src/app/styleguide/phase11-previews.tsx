"use client";

import * as React from "react";

import { AboutEditor, type AboutActions } from "@/components/about/about-editor";
import { BookPage, type BookPageActions } from "@/components/books/book-page";
import { Bookshelf, type BookshelfActions } from "@/components/books/bookshelf";
import { DailyLibrary, type LibraryActions } from "@/app/admin/settings/daily-library";
import {
  DatesSettings,
  ExportCard,
  PublicSiteSetting,
  ScriptureSettings,
  type SiteSettingsActions,
} from "@/app/admin/settings/site-settings";
import { DAILY_CONTENT } from "@/lib/daily-content";
import type { DailyItem } from "@/lib/daily";
import { SAMPLE_ABOUT, SAMPLE_BOOK, SAMPLE_BOOKS, SAMPLE_PARTNERS, SAMPLE_THUMBS } from "./phase11-sample";

const ok = (message: string) => async () => ({ ok: true as const, message });

export function BookshelfPreview({ empty }: { empty: boolean }) {
  const actions: BookshelfActions = React.useMemo(
    () => ({
      lookupIsbn: async (raw: string) =>
        raw.replace(/\D/g, "") === "9780140449136"
          ? {
              ok: true as const,
              isbn: "9780140449136",
              book: {
                title: "Crime and Punishment",
                author: "Fyodor Dostoyevsky",
                coverUrl: null,
                published: "2003",
              },
            }
          : {
              ok: false as const,
              message: "Open Library doesn’t know that ISBN. Fill in the details yourself.",
            },
      createBook: async () => ({ ok: true as const, message: "Book added to the shelf." }),
    }),
    [],
  );
  return (
    <Bookshelf
      books={empty ? [] : SAMPLE_BOOKS}
      partners={SAMPLE_PARTNERS}
      base="/styleguide/bookshelf"
      actions={actions}
    />
  );
}

export function BookPagePreview() {
  const actions: BookPageActions = React.useMemo(
    () => ({
      updateBook: ok("Saved."),
      deleteBook: ok("Book removed from the shelf."),
      addQuote: ok("Quote added."),
      deleteQuote: ok("Quote removed."),
    }),
    [],
  );
  return (
    <BookPage book={SAMPLE_BOOK} partners={SAMPLE_PARTNERS} base="/styleguide/bookshelf" actions={actions} />
  );
}

export function AboutEditorPreview() {
  const actions: AboutActions = React.useMemo(
    () => ({
      save: ok("Draft saved."),
      publish: async () => ({
        ok: true as const,
        message: "Published. The Our story page is up to date.",
        publishedAt: new Date().toISOString(),
      }),
    }),
    [],
  );
  return (
    <AboutEditor
      initial={SAMPLE_ABOUT}
      thumbs={SAMPLE_THUMBS}
      publishedAt="2026-10-01T12:00:00Z"
      unpublishedChanges={false}
      previewHref="/styleguide/about/preview"
      actions={actions}
    />
  );
}

export function SettingsPreview() {
  const site: SiteSettingsActions = React.useMemo(
    () => ({
      saveDates: ok("Dates saved."),
      saveScripture: ok("Scripture settings saved."),
      setPublicSite: async (on: boolean) => ({
        ok: true as const,
        message: on ? "The public site is on." : "The public site is off — visitors see “Coming soon”.",
      }),
    }),
    [],
  );
  const library: LibraryActions = React.useMemo(
    () => ({
      upsert: async () => ({ ok: true as const, message: "Added to the library.", id: crypto.randomUUID() }),
      setActive: async (_id: string, active: boolean) => ({
        ok: true as const,
        message: active ? "Turned back on." : "Turned off — it won’t be picked.",
      }),
    }),
    [],
  );
  const items: DailyItem[] = React.useMemo(
    () =>
      DAILY_CONTENT.map((d, i) => ({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        kind: d.kind,
        text: d.text,
        attribution: d.attribution ?? null,
        reference: d.reference ?? null,
        translation: d.translation ?? null,
        active: i % 9 !== 0,
      })),
    [],
  );
  return (
    <div className="flex flex-col gap-10">
      <Block id="s-dates" title="Anniversary and special dates">
        <DatesSettings
          anniversary="2023-05-08"
          specialDates={[{ date: "1994-11-18", label: "Afeez’s birthday" }]}
          actions={site}
        />
      </Block>
      <Block id="s-library" title="Daily words">
        <DailyLibrary items={items} translation="KJV" actions={library} />
      </Block>
      <Block id="s-scripture" title="Bible translation">
        <ScriptureSettings translation="KJV" notice="King James Version — public domain." actions={site} />
      </Block>
      <Block id="s-public" title="Public site">
        <PublicSiteSetting enabled actions={site} />
      </Block>
      <Block id="s-export" title="Export your data">
        <ExportCard href="#export" />
      </Block>
    </div>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="serif m-0 text-[30px]">
        {title}
      </h2>
      <div className="rounded-card border border-border bg-surface p-5 md:p-7">{children}</div>
    </section>
  );
}
