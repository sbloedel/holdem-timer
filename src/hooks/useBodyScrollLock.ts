import { useEffect } from 'react';

/**
 * Prevents the page from scrolling while `active` is true, by toggling a
 * `no-scroll` class on the `<html>` element (see index.css). Used on the
 * clock screen so it never shows a scrollbar, no matter the viewport size.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }

    const root = document.documentElement;
    root.classList.add('no-scroll');
    return () => root.classList.remove('no-scroll');
  }, [active]);
}
