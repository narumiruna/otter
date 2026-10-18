import { type RefCallback, useCallback } from "react";

const heightProperty = "--expense-footer-height";

/** Reserve space only for the visible footer, including wrapped text and safe areas. */
export function useExpenseFooter(): RefCallback<HTMLDivElement> {
  return useCallback((footer: HTMLDivElement | null) => {
    const shell = footer?.closest<HTMLElement>(".app-shell");
    if (!footer || !shell) return;

    const root = document.documentElement;
    const previousRootHeight = root.style.getPropertyValue(heightProperty);
    const previousShellHeight = shell.style.getPropertyValue(heightProperty);
    const restore = () => {
      for (const [element, previous] of [
        [root, previousRootHeight],
        [shell, previousShellHeight],
      ] as const) {
        if (previous) element.style.setProperty(heightProperty, previous);
        else element.style.removeProperty(heightProperty);
      }
      shell.removeAttribute("data-expense-footer");
    };
    const measure = () => {
      const height = footer.getBoundingClientRect().height;
      // Account settings keep the composer mounted inside a hidden wrapper.
      if (height <= 0 || !footer.getClientRects().length) {
        restore();
        return;
      }
      const value = `${height}px`;
      shell.style.setProperty(heightProperty, value);
      root.style.setProperty(heightProperty, value);
      shell.setAttribute("data-expense-footer", "");
    };

    const observer = new ResizeObserver(measure);
    observer.observe(footer);
    measure();
    return () => {
      observer.disconnect();
      restore();
    };
  }, []);
}
