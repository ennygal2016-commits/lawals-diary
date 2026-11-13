"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { type PartnerKey, initialOf } from "@/lib/site";

const partnerStyles: Record<PartnerKey, string> = {
  a: "border-accent bg-accent-soft text-accent-hover",
  b: "border-lavender bg-lavender-soft text-lavender-text",
};

const sizes = {
  sm: "size-8 text-[13px]",
  md: "size-11 text-[15px]",
  lg: "size-16 text-xl",
} as const;

export type AvatarProps = {
  name: string;
  partner: PartnerKey;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
};

/** DESIGN.md §3 Avatar — round, 1px border in the partner's colour, initial fallback. */
export function Avatar({ name, partner, src, size = "md", className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full border font-semibold",
        partnerStyles[partner],
        sizes[size],
        className,
      )}
    >
      {src ? <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center" aria-label={name}>
        {initialOf(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
