"use client";

import * as React from "react";

import { SegmentedFilter } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import {
  EMAIL_MODES,
  EMAIL_MODE_LABELS,
  type EmailMode,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  type NotifyPrefs,
} from "@/lib/notifications";
import { updateNotificationPrefs } from "@/server/actions/profile";

/** Settings › Notifications (PRD FR-41): per type, instant / daily digest / off. Each change saves straight away. */
export function NotificationPrefs({
  initial,
  save = updateNotificationPrefs,
}: {
  initial: NotifyPrefs;
  save?: typeof updateNotificationPrefs;
}) {
  const { toast } = useToast();
  const [prefs, setPrefs] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();

  function change(type: (typeof NOTIFICATION_TYPES)[number], mode: EmailMode) {
    const before = prefs;
    const next = { ...prefs, [type]: mode };
    setPrefs(next);
    startTransition(async () => {
      const result = await save(next);
      if (!result.ok) setPrefs(before);
      toast({ title: result.message, variant: result.ok ? "default" : "danger" });
    });
  }

  return (
    <ul className="m-0 flex list-none flex-col p-0" aria-busy={pending}>
      {NOTIFICATION_TYPES.map((type) => (
        <li
          key={type}
          className="flex flex-col gap-3 border-b border-divider-soft py-4 first:pt-0 last:border-b-0 last:pb-0 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] text-fg">{NOTIFICATION_TYPE_LABELS[type].label}</span>
            <span className="text-[13px] text-muted">{NOTIFICATION_TYPE_LABELS[type].hint}</span>
          </div>
          <SegmentedFilter
            label={`Email for ${NOTIFICATION_TYPE_LABELS[type].label.toLowerCase()}`}
            options={EMAIL_MODES.map((m) => ({ value: m, label: EMAIL_MODE_LABELS[m] }))}
            value={prefs[type]}
            onValueChange={(m) => change(type, m)}
          />
        </li>
      ))}
    </ul>
  );
}
