import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * DESIGN.md §3 Card — surface fill, 1px border, 20px radius.
 * featured: the scripture card (24px radius, stronger border, larger padding)
 * accent:   accent-tinted border (note composer, CTA panels)
 */
export const cardVariants = cva("rounded-card border bg-surface text-fg", {
  variants: {
    variant: {
      default: "border-border",
      featured: "relative overflow-hidden rounded-[20px] border-border-strong md:rounded-panel",
      accent: "border-border-accent",
    },
    padding: {
      none: "",
      sm: "px-6 py-5",
      md: "p-5 md:p-7",
      lg: "p-5 md:px-11 md:py-10",
    },
  },
  defaultVariants: { variant: "default", padding: "md" },
});

export type CardProps = React.ComponentProps<"div"> & VariantProps<typeof cardVariants>;

export function Card({ className, variant, padding, ...props }: CardProps) {
  return <div data-slot="card" className={cn(cardVariants({ variant, padding }), className)} {...props} />;
}
