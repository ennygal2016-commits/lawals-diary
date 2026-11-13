"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { RESTORE_DAYS } from "@/lib/validation/entry";
import { deleteEntry, restoreEntry } from "@/server/actions/entries";

/** Author-only Edit / Delete on the entry page (PRD FR-16). Delete is soft, with a 30-day restore. */
export function EntryAuthorActions({ entryId }: { entryId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteEntry(entryId);
      toast({ title: result.message, variant: result.ok ? "default" : "danger" });
      setOpen(false);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="subtle" size="sm">
        <Link href={`/admin/entries/${entryId}/edit`}>
          <Pencil aria-hidden strokeWidth={1.75} />
          Edit
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden strokeWidth={1.75} />
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>
              It disappears from the diary straight away. You can restore it from this page or from Drafts for{" "}
              {RESTORE_DAYS} days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RestoreButton({ entryId, size = "md" }: { entryId: string; size?: "sm" | "md" }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      variant="secondary"
      size={size}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await restoreEntry(entryId);
          toast({ title: result.message, variant: result.ok ? "default" : "danger" });
          if (result.ok) router.refresh();
        })
      }
    >
      <RotateCcw aria-hidden strokeWidth={1.75} />
      {pending ? "Restoring…" : "Restore"}
    </Button>
  );
}
