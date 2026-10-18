import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** What Tab stops on in a panel, in order: shown controls, and one radio a group (its checked one, if any). */
function tabStops(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el.getClientRects().length === 0) return false;
    if (!(el instanceof HTMLInputElement) || el.type !== "radio" || el.checked) return true;
    const group = [...root.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]`)];
    return !group.some((radio) => radio.checked) && group[0] === el;
  });
}

/** Keeps Tab and Shift+Tab inside an open aria-modal panel, wrapping at its ends as a native modal dialog does, so the
 *  keyboard never wanders onto the lake's buttons hidden behind it (WCAG 2.4.3). Only the topmost panel wraps. */
export function useTabWrap(panel: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = panel.current;
      if (event.key !== "Tab" || !root) return;
      const modals = document.querySelectorAll('[aria-modal="true"]');
      if (modals[modals.length - 1] !== root) return;
      const stops = tabStops(root);
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      if (!root.contains(at)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (at === first || at === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && at === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel]);
}
