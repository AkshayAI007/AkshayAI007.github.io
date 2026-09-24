const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab cycling inside an open dialog. */
export function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  const items = container.querySelectorAll<HTMLElement>(FOCUSABLE);
  if (!items.length) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
