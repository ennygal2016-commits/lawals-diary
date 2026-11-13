"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PartnerKey } from "@/lib/site";
import { markNotesRead, replyNote, sendNote } from "@/server/actions/notes";
import type { HomeNote } from "@/server/queries/home";
// The dialog (form + validation) loads on first open, keeping it out of Home's first load.
const NoteDialog = dynamic(() => import("./note-dialog").then((m) => m.NoteDialog), { ssr: false });

type PartnerInfo = { displayName: string; nickname: string; partner: PartnerKey };

const partnerText: Record<PartnerKey, string> = { a: "text-accent", b: "text-lavender" };
const partnerRule: Record<PartnerKey, string> = { a: "border-accent", b: "border-lavender" };

/**
 * DESIGN.md §3 Note card + PRD FR-8/FR-9. Composer card on the left (it opens the dialog), the two collapsible
 * lists on the right; stacked on phones.
 */
export function NotesSection({
  me,
  partner,
  received,
  sent,
}: {
  me: PartnerInfo;
  partner: PartnerInfo;
  received: { notes: HomeNote[]; total: number; unread: number };
  sent: { notes: HomeNote[]; total: number; answered: number };
}) {
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState<HomeNote | null>(null);
  // Mount the (lazily loaded) dialogs only once one is wanted, so Home's first load doesn't fetch them.
  const [dialogsWanted, setDialogsWanted] = React.useState(false);
  if (!dialogsWanted && (composeOpen || replyTo !== null)) setDialogsWanted(true);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr] lg:gap-5">
      {/* Composer */}
      <section
        aria-labelledby="note-composer-heading"
        className="flex flex-col gap-4 rounded-card border border-border-accent bg-surface p-5 md:p-7"
      >
        <h2 id="note-composer-heading" className="serif m-0 text-[28px] leading-tight md:text-[32px]">
          Leave a note for <em className={partnerText[partner.partner]}>{partner.nickname}</em>
        </h2>
        <p className="eyebrow m-0" aria-hidden>
          Your note
        </p>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="flex min-h-28 w-full items-start rounded-btn border border-border bg-bg px-4 py-3.5 text-left text-base text-faint transition-colors hover:border-border-strong"
        >
          {/* The visible prompt starts the accessible name (WCAG 2.5.3); the action follows for screen readers. */}
          Something only {partner.nickname} needs to read…
          <span className="visually-hidden"> Write a note for {partner.nickname}</span>
        </button>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[13px] text-faint">Up to 1,000 characters</span>
          <Button variant="secondary" onClick={() => setComposeOpen(true)}>
            Write a note
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        {/* Earlier notes from partner */}
        <NoteList
          id="received"
          title={`Earlier notes from ${partner.nickname}`}
          count={`(${received.total})`}
          defaultOpen={received.total > 0}
          empty={`No notes from ${partner.nickname} yet.`}
          notes={received.notes}
          total={received.total}
          markRead
          renderNote={(note) => (
            <ReceivedNote key={note.id} note={note} from={partner} onReply={() => setReplyTo(note)} />
          )}
        />

        {/* Notes you sent */}
        <NoteList
          id="sent"
          title="Notes you sent"
          count={`(${sent.total} · ${sent.answered} answered)`}
          defaultOpen={false}
          empty="You haven’t sent a note yet."
          notes={sent.notes}
          total={sent.total}
          renderNote={(note) => <SentNote key={note.id} note={note} me={me} partner={partner} />}
        />
      </div>

      {dialogsWanted ? (
        <>
          <NoteDialog
            open={composeOpen}
            onOpenChange={setComposeOpen}
            title={
              <>
                Leave a note for <em className={partnerText[partner.partner]}>{partner.nickname}</em>
              </>
            }
            description={`${partner.nickname} will see it on Home and can reply once.`}
            label="Your note"
            placeholder={`Something only ${partner.nickname} needs to read…`}
            submitLabel="Send note"
            onSubmit={(body) => sendNote({ body })}
          />

          <NoteDialog
            open={replyTo !== null}
            onOpenChange={(open) => (open ? null : setReplyTo(null))}
            title={
              <>
                Reply to <em className={partnerText[partner.partner]}>{partner.nickname}</em>
              </>
            }
            description="You can reply once. It marks the note answered."
            quote={replyTo?.body}
            label="Your reply"
            placeholder="Write your reply…"
            submitLabel="Send reply"
            onSubmit={(body) => replyNote({ noteId: replyTo!.id, body })}
          />
        </>
      ) : null}
    </div>
  );
}

function NoteList({
  id,
  title,
  count,
  defaultOpen,
  empty,
  notes,
  total,
  markRead = false,
  renderNote,
}: {
  id: string;
  title: string;
  count: string;
  defaultOpen: boolean;
  empty: string;
  notes: HomeNote[];
  total: number;
  markRead?: boolean;
  renderNote: (note: HomeNote) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const headingId = `notes-${id}-heading`;
  const panelId = `notes-${id}-panel`;

  // Opening the received list marks its unread notes as read (markNoteRead, DESIGN.md §9).
  const unreadIds = React.useMemo(() => notes.filter((n) => n.unread).map((n) => n.id), [notes]);
  React.useEffect(() => {
    if (markRead && open && unreadIds.length > 0) void markNotesRead(unreadIds);
  }, [markRead, open, unreadIds]);

  return (
    <section aria-labelledby={headingId} className="rounded-card border border-border bg-surface">
      <h2 id={headingId} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-card px-5 py-5 text-left md:px-6"
        >
          <span className="text-[15px] font-medium text-fg">{title}</span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-muted">{count}</span>
            <ChevronDown
              aria-hidden
              strokeWidth={1.75}
              className={cn("size-4 text-muted transition-transform", open && "rotate-180")}
            />
          </span>
        </button>
      </h2>
      <div id={panelId} hidden={!open} className="px-5 pb-5 md:px-6">
        {notes.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{empty}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-5 p-0">{notes.map(renderNote)}</ul>
        )}
        {total > notes.length ? (
          <p className="mt-4 mb-0 font-mono text-[12px] text-faint">
            Showing the latest {notes.length} of {total}.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ReceivedNote({ note, from, onReply }: { note: HomeNote; from: PartnerInfo; onReply: () => void }) {
  return (
    <li className={cn("flex flex-col gap-3 border-l-2 pl-4", partnerRule[from.partner])}>
      <blockquote className="serif m-0 text-[19px] leading-snug italic md:text-[21px]">
        “{note.body}”
      </blockquote>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[12px] text-muted uppercase">
          {note.stamp}
          {note.unread ? <span className="ml-2 text-lavender">· New</span> : null}
        </span>
        {note.reply ? null : (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full border border-border-strong"
            onClick={onReply}
          >
            Reply once
          </Button>
        )}
      </div>
      {note.reply ? <Reply label="You replied" reply={note.reply} /> : null}
    </li>
  );
}

function SentNote({ note, me, partner }: { note: HomeNote; me: PartnerInfo; partner: PartnerInfo }) {
  return (
    <li className={cn("flex flex-col gap-3 border-l-2 pl-4", partnerRule[me.partner])}>
      <blockquote className="serif m-0 text-[19px] leading-snug italic md:text-[21px]">
        “{note.body}”
      </blockquote>
      <span className="font-mono text-[12px] text-muted uppercase">
        {note.stamp} · {note.reply ? "Answered" : note.unread ? "Not read yet" : "Read"}
      </span>
      {note.reply ? <Reply label={`${partner.nickname} replied`} reply={note.reply} /> : null}
    </li>
  );
}

function Reply({ label, reply }: { label: string; reply: NonNullable<HomeNote["reply"]> }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-tile bg-raised px-4 py-3">
      <span className="eyebrow">{label}</span>
      <p className="m-0 text-[15px] text-fg-soft">{reply.body}</p>
      <span className="font-mono text-[12px] text-faint uppercase">{reply.stamp}</span>
    </div>
  );
}
