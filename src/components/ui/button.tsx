import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * DESIGN.md §3 Button.
 * primary   — accent fill, accent-ink text, soft glow ("New entry", "Save entry")
 * secondary — transparent, 1px accent border, accent text ("Send note", "Write about it")
 * ghost     — transparent, soft text, raised hover (toolbar / nav-like actions)
 * subtle    — overlay fill pill ("Reply once")
 * inverse   — light fill, dark text (selected / high-emphasis on dark)
 * danger    — danger border + text (delete)
 */
export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold no-underline",
    "transition-[background-color,border-color,color,box-shadow] duration-150",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink shadow-glow hover:bg-accent-hover hover:text-accent-ink [a&]:text-accent-ink",
        secondary:
          "border border-accent bg-transparent text-accent hover:bg-accent-soft hover:text-accent-hover [a&]:text-accent",
        ghost: "bg-transparent font-medium text-fg-soft hover:bg-raised hover:text-fg [a&]:text-fg-soft",
        subtle:
          "border border-border-muted bg-overlay font-normal text-fg hover:border-border-dashed hover:text-fg [a&]:text-fg",
        inverse: "bg-inverse text-inverse-ink hover:bg-fg-soft hover:text-inverse-ink [a&]:text-inverse-ink",
        danger:
          "border border-danger bg-transparent text-danger hover:bg-danger-soft hover:text-danger [a&]:text-danger",
      },
      size: {
        sm: "h-9 rounded-full px-3.5 text-[13px]",
        md: "h-11 rounded-btn px-5 text-[15px] [&_svg]:size-[18px]",
        lg: "h-14 rounded-btn-lg px-7 text-base [&_svg]:size-5",
        block: "h-14 w-full rounded-[16px] px-6 text-[17px] md:h-[60px] [&_svg]:size-5",
        icon: "size-11 rounded-btn [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Next <Link>) with button styling. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      // Default to type="button" so buttons inside forms never submit by accident.
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}
