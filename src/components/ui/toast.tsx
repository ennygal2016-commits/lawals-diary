"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * DESIGN.md §3 Toast — bottom centre, inverse fill (light with dark text), 4 s.
 * Sits above the phone tab bar. Built on Radix Toast (part of shadcn's radix-ui dependency),
 * so it is announced to screen readers and pauses while hovered or focused.
 */

type ToastVariant = "default" | "danger";
type ToastInput = { title: string; description?: string; variant?: ToastVariant; durationMs?: number };
type ToastItem = ToastInput & { id: number; open: boolean };

const ToastContext = React.createContext<((toast: ToastInput) => void) | null>(null);

export function useToast() {
  const push = React.useContext(ToastContext);
  if (!push) throw new Error("useToast must be used inside <ToastProvider>");
  return { toast: push };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(1);

  const push = React.useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setItems((prev) => [...prev.slice(-2), { ...toast, id, open: true }]);
  }, []);

  const close = (id: number) =>
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
  const remove = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={push}>
      <ToastPrimitive.Provider swipeDirection="down" duration={4000} label="Notification">
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            open={t.open}
            duration={t.durationMs ?? 4000}
            onOpenChange={(open) => (open ? null : close(t.id))}
            onAnimationEnd={() => (t.open ? null : remove(t.id))}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-3 rounded-btn px-4 py-3 shadow-fab",
              t.variant === "danger"
                ? "border border-danger bg-danger-soft text-fg"
                : "bg-inverse text-inverse-ink",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
              "data-[swipe=move]:translate-y-(--radix-toast-swipe-move-y) data-[swipe=end]:animate-out",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <ToastPrimitive.Title className="text-[15px] font-medium">{t.title}</ToastPrimitive.Title>
              {t.description ? (
                <ToastPrimitive.Description className="text-sm opacity-80">
                  {t.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss"
              className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100"
            >
              <XIcon className="size-4" aria-hidden />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        {/* Mounted only while a toast exists: an always-present empty viewport stopped Chrome from recording the
            page's Largest Contentful Paint on phones (Lighthouse "no LCP" → poor performance score). */}
        {items.length > 0 ? (
          <ToastPrimitive.Viewport
            className={cn(
              "fixed left-1/2 z-[60] flex w-[calc(100%-2.5rem)] max-w-[420px] -translate-x-1/2 flex-col gap-2 outline-none",
              "bottom-[calc(100px+env(safe-area-inset-bottom))] lg:bottom-6",
            )}
          />
        ) : null}
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
