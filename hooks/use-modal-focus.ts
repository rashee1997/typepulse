'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus contract for `role="dialog" aria-modal="true"` surfaces.
 *
 * The ARIA APG requires four things of a modal dialog and hand-rolling them per
 * component is how dialogs end up marked modal without behaving like one: focus
 * moves inside on open, Tab and Shift+Tab cycle inside, Escape closes, and focus
 * returns to the element that opened it. Background scrolling is locked at the
 * same time, because `aria-modal` promises the page behind is inert.
 *
 * `onClose` is read through a ref so callers can pass an inline arrow without
 * re-running the effect (a re-run would re-steal focus on every render).
 */
export function useModalFocus<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const dialogRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // App shells that scroll inside their own container (the studio does) are not
    // reachable through `body`. Marking them inert makes the promise of
    // `aria-modal` true for pointers, keyboards and assistive tech alike.
    const lockedShells = Array.from(document.querySelectorAll<HTMLElement>('[data-modal-scroll-lock]'));
    lockedShells.forEach((shell) => {
      shell.inert = true;
    });

    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    (focusables()[0] ?? dialog).focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const isOutside = !dialog.contains(active);

      if (event.shiftKey && (active === first || isOutside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || isOutside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      lockedShells.forEach((shell) => {
        shell.inert = false;
      });
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return dialogRef;
}
