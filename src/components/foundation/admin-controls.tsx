"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { shrinkImage } from "@/lib/images/shrink";
import { APPLICATION_STATUSES, DOC_INPUT_ACCEPT } from "@/lib/validation/foundation";
import {
  type FoundationResult,
  addApplicationNote,
  recordPayment,
  setApplicationStatus,
} from "@/server/actions/foundation";
import type { ApplicationStatus } from "@/types/database";

export type FoundationActions = {
  setStatus: typeof setApplicationStatus;
  addNote: typeof addApplicationNote;
  recordPayment: typeof recordPayment;
};

export const serverFoundationActions: FoundationActions = {
  setStatus: setApplicationStatus,
  addNote: addApplicationNote,
  recordPayment,
};

function useAction() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const run = (fn: () => Promise<FoundationResult>, onOk?: () => void) =>
    startTransition(async () => {
      const result = await fn();
      toast({ title: result.message, variant: result.ok ? "default" : "danger" });
      if (result.ok) {
        onOk?.();
        router.refresh();
      }
    });
  return { pending, run };
}

/** Status changer (PRD FR-35): every change is logged to application_events with who and when. */
export function StatusChanger({
  id,
  status,
  actions = serverFoundationActions,
}: {
  id: string;
  status: ApplicationStatus;
  actions?: FoundationActions;
}) {
  const [next, setNext] = React.useState<ApplicationStatus>(status);
  const [note, setNote] = React.useState("");
  const { pending, run } = useAction();
  React.useEffect(() => setNext(status), [status]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => actions.setStatus({ id, status: next, note }),
          () => setNote(""),
        );
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Status">
        {(c) => (
          <select
            {...c}
            value={next}
            onChange={(e) => setNext(e.target.value as ApplicationStatus)}
            className="h-12 w-full rounded-input border border-border bg-raised px-3 text-[15px] text-fg"
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Why (optional)" hint="Saved with the change in the history.">
        {(c) => <Input {...c} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      <div>
        <Button type="submit" disabled={pending || next === status}>
          {pending ? "Saving…" : "Update status"}
        </Button>
      </div>
    </form>
  );
}

/** Private notes — only the two admins ever see them; they appear in the history. */
export function NoteForm({
  id,
  actions = serverFoundationActions,
}: {
  id: string;
  actions?: FoundationActions;
}) {
  const [note, setNote] = React.useState("");
  const { pending, run } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => actions.addNote({ id, note }),
          () => setNote(""),
        );
      }}
      className="flex flex-col gap-3"
    >
      <Field label="Add a private note">
        {(c) => (
          <Textarea
            {...c}
            rows={3}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Only the two of you can read this."
          />
        )}
      </Field>
      <div>
        <Button type="submit" variant="secondary" disabled={pending || !note.trim()}>
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}

/** Payment record for Funded applications: amount (CAD), date and a receipt (PDF or photo). */
export function PaymentForm({
  id,
  amount,
  paidOn,
  hasReceipt,
  today,
  actions = serverFoundationActions,
}: {
  id: string;
  amount: number | null;
  paidOn: string | null;
  hasReceipt: boolean;
  today: string;
  actions?: FoundationActions;
}) {
  const { pending, run } = useAction();
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("id", id);
        const receipt = data.get("receipt");
        if (receipt instanceof File && receipt.size > 0) data.set("receipt", await shrinkImage(receipt));
        run(() => actions.recordPayment(data));
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <Field label="Amount paid (CAD)" required>
        {(c) => (
          <Input
            {...c}
            name="amount"
            inputMode="decimal"
            defaultValue={amount === null ? "" : amount.toFixed(2)}
            placeholder="0.00"
          />
        )}
      </Field>
      <Field label="Date paid" required>
        {(c) => <Input {...c} name="paid_on" type="date" max={today} defaultValue={paidOn ?? today} />}
      </Field>
      <Field
        label={hasReceipt ? "Replace receipt" : "Receipt"}
        hint="PDF or photo, up to 10 MB. Location data is removed from photos."
        className="md:col-span-2"
      >
        {(c) => (
          <input
            {...c}
            name="receipt"
            type="file"
            accept={DOC_INPUT_ACCEPT}
            className="text-[14px] text-fg-soft file:mr-3 file:h-10 file:rounded-btn file:border file:border-accent file:bg-transparent file:px-4 file:text-accent"
          />
        )}
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : amount === null ? "Record payment" : "Update payment"}
        </Button>
      </div>
    </form>
  );
}
