/** WCAG 2.4.1 — first focusable element on every page; slides into view on focus. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="fixed top-3 left-3 z-[70] -translate-y-24 rounded-btn bg-inverse px-4 py-2.5 font-medium text-inverse-ink no-underline transition-transform focus:translate-y-0 hover:text-inverse-ink"
    >
      Skip to content
    </a>
  );
}
