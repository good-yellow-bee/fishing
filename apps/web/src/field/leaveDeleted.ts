import type { NavigateFunction } from "react-router-dom";
import { hasMovedInApp } from "./FieldShell";

/** The link state a list's card gives the page it opens, so a delete there can go back to the list. */
export const FROM_LIST = { fromList: true } as const;

/** The page a delete went Back from, so its Undo comes forward to it again rather than in the list's place. */
let leftBackFrom: string | null = null;

/**
 * After a delete, off the gone page: Back to the list it was opened from, so the list isn't in history twice; else
 * to `fallback` in the gone page's place, so Back never lands on it. Undo can put it back where it was either way.
 */
export function leaveDeleted(navigate: NavigateFunction, state: unknown, fallback: string) {
  const fromList = Boolean((state as { fromList?: unknown } | null)?.fromList) && hasMovedInApp();
  leftBackFrom = fromList ? window.location.pathname + window.location.search : null;
  if (fromList) navigate(-1);
  else navigate(fallback, { replace: true });
}

/** Whether the delete made from `from` went Back to its list. */
export function leftBackTo(from: string): boolean {
  return leftBackFrom === from;
}
