"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";

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
import { useToast } from "@/components/ui/toast";
import { NOTE_MAX, sendNoteSchema, type SendNoteInput } from "@/lib/validation/notes";
import type { NoteActionResult } from "@/server/actions/notes";

/**
 * The note composer dialog (PRD FR-8), used for a new note and for the one reply.
 * React Hook Form + the same Zod schema the server action uses.
 */
export function NoteDialog({
  open,
  onOpenChange,
  title,
  description,
  quote,
  label,
  placeholder,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The note being replied to. */
  quote?: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (body: string) => Promise<NoteActionResult>;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SendNoteInput>({ resolver: zodResolver(sendNoteSchema), defaultValues: { body: "" } });

  const submit = handleSubmit(({ body }) =>
    startTransition(async () => {
      const result = await onSubmit(body);
      if (result.ok) {
        reset({ body: "" });
        onOpenChange(false);
        toast({ title: result.message });
      } else {
        setError("body", { message: result.message });
      }
    }),
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? null : onOpenChange(next))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {quote ? (
          <blockquote className="serif m-0 border-l-2 border-border-strong pl-4 text-[19px] leading-snug text-fg-soft italic">
            “{quote}”
          </blockquote>
        ) : null}

        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <Field label={label} error={errors.body?.message}>
            {(fieldProps) => (
              <Controller
                control={control}
                name="body"
                render={({ field }) => (
                  <Textarea
                    {...fieldProps}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    maxLength={NOTE_MAX}
                    showCount
                    rows={5}
                    placeholder={placeholder}
                    autoFocus
                  />
                )}
              />
            )}
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" disabled={pending}>
              <Send aria-hidden strokeWidth={1.75} />
              {pending ? "Sending…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
