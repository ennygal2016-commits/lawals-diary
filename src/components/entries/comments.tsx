"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { InitialChip } from "@/components/ui/badges";
import { Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { COMMENT_MAX, commentSchema } from "@/lib/validation/entry";
import { addComment, deleteComment } from "@/server/actions/entries";
import type { PartnerKey } from "@/lib/site";

export type CommentView = {
  id: string;
  body: string;
  stamp: string;
  mine: boolean;
  author: { name: string; partner: PartnerKey };
};

const formSchema = commentSchema.pick({ body: true });
type FormValues = z.infer<typeof formSchema>;

/** Comments (PRD FR-17): either partner can comment; you can delete your own. */
export function Comments({ entryId, comments }: { entryId: string; comments: CommentView[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { body: "" } });

  const body = watch("body");

  const onSubmit = handleSubmit(({ body }) =>
    startTransition(async () => {
      const result = await addComment({ entryId, body });
      if (result.ok) {
        reset({ body: "" });
        router.refresh();
      } else setError("body", { message: result.message });
    }),
  );

  function remove(id: string) {
    setDeleting(id);
    startTransition(async () => {
      const result = await deleteComment(id);
      setDeleting(null);
      toast({ title: result.message, variant: result.ok ? "default" : "danger" });
      if (result.ok) router.refresh();
    });
  }

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-5">
      <h2 id="comments-heading" className="serif m-0 text-[28px] leading-none">
        Comments <span className="font-mono text-[15px] text-muted">({comments.length})</span>
      </h2>

      {comments.length === 0 ? (
        <p className="m-0 text-[15px] text-muted">No comments yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0 p-0">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 border-b border-divider-soft py-4 first:pt-0">
              <InitialChip name={c.author.name} partner={c.author.partner} className="mt-0.5" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-[13px] text-muted">
                  <span className="font-medium text-fg">{c.author.name}</span>
                  <span className="font-mono uppercase">{c.stamp}</span>
                </p>
                <p className="m-0 text-[15px] whitespace-pre-line text-fg-soft">{c.body}</p>
              </div>
              {c.mine ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(c.id)}
                  disabled={deleting === c.id}
                  aria-label={`Delete your comment from ${c.stamp}`}
                >
                  Delete
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <Field label="Add a comment" error={errors.body?.message}>
          {(control) => (
            <Textarea
              {...control}
              rows={3}
              maxLength={COMMENT_MAX}
              placeholder="Say something about this day…"
              {...register("body")}
            />
          )}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" disabled={pending || !body.trim()}>
            {pending && !deleting ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </form>
    </section>
  );
}
