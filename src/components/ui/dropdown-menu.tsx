"use client";

import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * DESIGN.md §3 More menu / dropdown — 200px wide, 12px radius, soft shadow,
 * icon + label rows 44px tall. Closes on outside click and Esc (Radix).
 */
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-[200px] overflow-hidden rounded-btn border border-border bg-overlay p-1.5 text-fg shadow-menu",
          "max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto",
          "origin-(--radix-dropdown-menu-content-transform-origin)",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { variant?: "default" | "danger" }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        "relative flex h-11 cursor-pointer items-center gap-3 rounded-[8px] px-3 text-[15px] text-fg-soft no-underline outline-none select-none",
        "focus:bg-raised focus:text-fg data-[highlighted]:bg-raised data-[highlighted]:text-fg",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "data-[variant=danger]:text-danger",
        "[&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-muted",
        "aria-[current=page]:text-accent aria-[current=page]:[&_svg]:text-accent",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return <DropdownMenuPrimitive.Label className={cn("px-3 pt-2 pb-1.5", className)} {...props} />;
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator className={cn("-mx-1.5 my-1.5 h-px bg-divider", className)} {...props} />
  );
}
