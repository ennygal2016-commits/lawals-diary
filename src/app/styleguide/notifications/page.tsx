import { createElement } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { render } from "@react-email/components";

import { DigestEmail } from "@/emails/digest-email";
import { NotificationEmail } from "@/emails/notification-email";
import { ToastProvider } from "@/components/ui/toast";
import { NotificationsPreview } from "./preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications preview", robots: { index: false, follow: false } };

/** Dev tool: the bell (sample data, ?empty=1), the Settings control and both emails as they will arrive. */
export default async function NotificationsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();
  const empty = (await searchParams).empty === "1";
  const siteUrl = "https://diary.example";
  const [instant, digest] = await Promise.all([
    render(createElement(NotificationEmail, { line: "D_Gal left you a note", href: "/admin", siteUrl })),
    render(
      createElement(DigestEmail, {
        siteUrl,
        date: "Tuesday 3 November",
        items: [
          { line: "D_Gal wrote a new entry", href: "/admin/entries/e1", when: "Today · 09:12" },
          { line: "D_Gal commented on an entry", href: "/admin/entries/e2", when: "Yesterday · 21:30" },
          {
            line: "New foundation application FDN-2026-0042",
            href: "/admin/foundation/a1",
            when: "Yesterday · 14:05",
          },
        ],
      }),
    ),
  ]);

  return (
    <ToastProvider>
      <main id="main" className="pb-24">
        <h1 className="visually-hidden">Notifications preview</h1>
        <NotificationsPreview empty={empty} />
        <section
          aria-labelledby="emails-heading"
          className="mx-auto mt-10 flex max-w-[1304px] flex-col gap-4 px-5 md:px-8"
        >
          <h2 id="emails-heading" className="serif m-0 text-[30px]">
            Emails
          </h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <iframe
              title="Instant email"
              srcDoc={instant}
              className="h-[520px] w-full rounded-card border border-border"
            />
            <iframe
              title="Daily digest email"
              srcDoc={digest}
              className="h-[520px] w-full rounded-card border border-border"
            />
          </div>
        </section>
      </main>
    </ToastProvider>
  );
}
