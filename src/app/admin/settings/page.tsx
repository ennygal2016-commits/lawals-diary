import type { Metadata } from "next";

import { PageContainer, PageHeader } from "@/components/shell/page";
import { SHARED_TIMEZONE, otherPartner } from "@/lib/site";
import { getMyNotifyPrefs } from "@/server/queries/notifications";
import { getDailyLibrary, getSiteSettings } from "@/server/queries/settings";
import { getViewer } from "@/server/queries/viewer";
import { AvatarEditor } from "./avatar-editor";
import { DailyLibrary } from "./daily-library";
import { NotificationPrefs } from "./notification-prefs";
import { ProfileForm } from "./profile-form";
import { DatesSettings, ExportCard, PublicSiteSetting, ScriptureSettings } from "./site-settings";

export const metadata: Metadata = { title: "Settings" };

function timeZoneOptions(current: string): string[] {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  zones.add(SHARED_TIMEZONE);
  zones.add(current);
  return [...zones].sort((a, b) => a.localeCompare(b));
}

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <div>
        <h2 id={id} className="serif m-0 text-[30px] leading-tight">
          {title}
        </h2>
        {intro ? <p className="mt-1 mb-0 text-[15px] text-muted">{intro}</p> : null}
      </div>
      <div className="rounded-card border border-border bg-surface p-5 md:p-7">{children}</div>
    </section>
  );
}

/** Settings (PRD FR-42): profile, notifications, dates, daily library, scripture, public site, export. */
export default async function SettingsPage() {
  const viewer = await getViewer();
  const [prefs, site, library] = await Promise.all([
    getMyNotifyPrefs(viewer.userId),
    getSiteSettings(),
    getDailyLibrary(),
  ]);

  return (
    <PageContainer width="narrow" className="gap-12">
      <PageHeader title="Settings" />

      <Section
        id="profile-heading"
        title="Profile"
        intro={`How you appear in the diary. Your nickname is what ${otherPartner(viewer.partner).displayName} sees.`}
      >
        <AvatarEditor name={viewer.displayName} partner={viewer.partner} avatarUrl={viewer.avatarUrl} />
        <div className="my-6 h-px bg-divider" />
        <ProfileForm
          defaults={{
            display_name: viewer.displayName,
            nickname: viewer.nickname,
            timezone: viewer.timezone,
          }}
          timeZones={timeZoneOptions(viewer.timezone)}
          email={viewer.email}
        />
      </Section>

      <Section
        id="notifications-heading"
        title="Notifications"
        intro={`The bell always shows everything. Choose which ones also arrive by email at ${viewer.email || "your sign-in address"}. Emails say what happened and link here — they never include the words of an entry, note or comment.`}
      >
        <NotificationPrefs initial={prefs} />
      </Section>

      <Section id="dates-heading" title="Anniversary and special dates" intro="Shared by both of you.">
        <DatesSettings anniversary={site.anniversary} specialDates={site.specialDates} />
      </Section>

      <Section
        id="library-heading"
        title="Daily words"
        intro="The scripture, romance, love, faith and encouragement cards on Home are picked from these. Turned-off items are never picked."
      >
        <DailyLibrary items={library} translation={site.bibleTranslation} />
      </Section>

      <Section id="scripture-heading" title="Bible translation">
        <ScriptureSettings translation={site.bibleTranslation} notice={site.bibleNotice} />
      </Section>

      <Section id="public-site-heading" title="Public site">
        <PublicSiteSetting enabled={site.publicSiteEnabled} />
      </Section>

      <Section id="export-heading" title="Export your data">
        <ExportCard />
      </Section>
    </PageContainer>
  );
}
