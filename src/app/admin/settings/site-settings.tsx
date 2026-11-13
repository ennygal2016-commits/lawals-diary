"use client";

import * as React from "react";
import { Download, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { SpecialDate } from "@/lib/calendar";
import { type SettingsResult, saveDates, saveScripture, setPublicSite } from "@/server/actions/settings";

export type SiteSettingsActions = {
  saveDates: typeof saveDates;
  saveScripture: typeof saveScripture;
  setPublicSite: typeof setPublicSite;
};
const serverActions: SiteSettingsActions = { saveDates, saveScripture, setPublicSite };

function useRun() {
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const run = (fn: () => Promise<SettingsResult>, onFail?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      toast({ title: r.message, variant: r.ok ? "default" : "danger" });
      if (!r.ok) onFail?.();
    });
  return { pending, run };
}

/** Anniversary + special dates (shown as hearts on the calendar; the anniversary drives the days-together ring). */
export function DatesSettings({
  anniversary: initialAnniversary,
  specialDates: initialSpecial,
  actions = serverActions,
}: {
  anniversary: string | null;
  specialDates: SpecialDate[];
  actions?: SiteSettingsActions;
}) {
  const [anniversary, setAnniversary] = React.useState(initialAnniversary ?? "");
  const [special, setSpecial] = React.useState<SpecialDate[]>(initialSpecial);
  const { pending, run } = useRun();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => actions.saveDates({ anniversary, special_dates: special }));
      }}
    >
      <Field label="Anniversary" hint="Starts the days-together count on Home.">
        {(c) => (
          <Input
            {...c}
            type="date"
            value={anniversary}
            className="max-w-[220px]"
            onChange={(e) => setAnniversary(e.target.value)}
          />
        )}
      </Field>
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="eyebrow mb-2 p-0">Special dates (every year)</legend>
        {special.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">None yet — birthdays, the day you met…</p>
        ) : null}
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {special.map((s, i) => (
            <li key={i} className="flex flex-wrap items-end gap-3">
              <Field label="Date">
                {(c) => (
                  <Input
                    {...c}
                    type="date"
                    value={s.date}
                    className="w-[180px]"
                    onChange={(e) =>
                      setSpecial(special.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))
                    }
                  />
                )}
              </Field>
              <Field label="Name" className="min-w-[200px] flex-1">
                {(c) => (
                  <Input
                    {...c}
                    value={s.label}
                    maxLength={80}
                    placeholder="Nurat’s birthday"
                    onChange={(e) =>
                      setSpecial(special.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                  />
                )}
              </Field>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove special date ${i + 1}`}
                onClick={() => setSpecial(special.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="ghost" size="sm" onClick={() => setSpecial([...special, { date: "", label: "" }])}>
            <Plus aria-hidden strokeWidth={1.75} />
            Add a special date
          </Button>
        </div>
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save dates"}
        </Button>
      </div>
    </form>
  );
}

/** The Bible translation code and the licence notice shown under the scripture card. */
export function ScriptureSettings({
  translation,
  notice,
  actions = serverActions,
}: {
  translation: string;
  notice: string;
  actions?: SiteSettingsActions;
}) {
  const [t, setT] = React.useState(translation);
  const [n, setN] = React.useState(notice);
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-5 md:grid-cols-[160px_1fr]"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => actions.saveScripture({ bible_translation: t, bible_notice: n }));
      }}
    >
      <Field label="Translation" hint="Short code, e.g. KJV.">
        {(c) => (
          <Input {...c} value={t} maxLength={12} onChange={(e) => setT(e.target.value.toUpperCase())} />
        )}
      </Field>
      <Field label="Notice under the verse" hint="Use the wording the translation’s licence asks for.">
        {(c) => <Input {...c} value={n} maxLength={200} onChange={(e) => setN(e.target.value)} />}
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          Save scripture settings
        </Button>
      </div>
    </form>
  );
}

/** Public site on/off (PRD FR-42). */
export function PublicSiteSetting({
  enabled,
  actions = serverActions,
}: {
  enabled: boolean;
  actions?: SiteSettingsActions;
}) {
  const [on, setOn] = React.useState(enabled);
  const { pending, run } = useRun();
  return (
    <Switch
      label="Public site"
      description={
        on
          ? "On: anyone can see Our story, the Journal, the Gallery and the Foundation page."
          : "Off: every public page shows “Coming soon”. Nothing private is ever public either way."
      }
      checked={on}
      disabled={pending}
      onCheckedChange={(v) => {
        setOn(v);
        run(
          () => actions.setPublicSite(v),
          () => setOn(!v),
        );
      }}
    />
  );
}

/** Data export: a ZIP of JSON + photos, streamed from /api/export. */
export function ExportCard({ href = "/api/export" }: { href?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[15px] text-fg-soft">
        Download everything as a ZIP: all entries, comments, notes, books, the About page, settings, the daily
        library and foundation records as JSON, plus every photo at its largest stored size.
      </p>
      <p className="m-0 text-[13px] text-muted">
        Photos are cleaned of location data when uploaded, so the export holds those cleaned copies (2400 px).
        A big library can take a minute.
      </p>
      <div>
        <Button asChild variant="secondary">
          <a href={href} download>
            <Download aria-hidden strokeWidth={1.75} />
            Download export (.zip)
          </a>
        </Button>
      </div>
    </div>
  );
}
