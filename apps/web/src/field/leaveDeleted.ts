import type { NavigateFunction } from "react-router-dom";
import { canGoBack } from "./FieldShell";
import { savedState, sayAfterBack, type SavedKind } from "./SavedNote";

/** The link state a list's card gives the page it opens, so a delete there can go back to the list. */
export const FROM_LIST = { fromList: true } as const;

/** The page a delete went Back from, so its Undo comes forward to it again rather than in the list's place. */
let leftBackFrom: string | null = null;

/**
 * After a delete, off the gone page: Back to the list it was opened from, so the list isn't in history twice; else
 * to `fallback` in the gone page's place, so Back never lands on it. Undo can put it back where it was either way.
 */
export function leaveDeleted(navigate: NavigateFunction, state: unknown, fallback: string) {
  const fromList = openedFromList(state) && canGoBack();
  leftBackFrom = fromList ? window.location.pathname + window.location.search : null;
  if (fromList) navigate(-1);
  else navigate(fallback, { replace: true });
}

/** Whether the delete made from `from` went Back to its list. */
export function leftBackTo(from: string): boolean {
  return leftBackFrom === from;
}

function openedFromList(state: unknown): boolean {
  return Boolean((state as { fromList?: unknown } | null)?.fromList);
}

/** The link state an entry's page gives its edit form: opened from that page, which may have come from a list. */
export function editFromPage(state: unknown) {
  return { fromPage: true, ...(openedFromList(state) ? FROM_LIST : {}) };
}

/**
 * After an edit's Save: Back to the page the form was opened from, so that page isn't in history twice; opened any
 * other way, the form gives way to `to`. The page still knows it came from a list, so a delete there goes back to it.
 */
export function leaveSaved(navigate: NavigateFunction, state: unknown, to: string, kind: SavedKind = "catchEdit") {
  if ((state as { fromPage?: unknown } | null)?.fromPage && canGoBack()) {
    sayAfterBack(kind);
    navigate(-1);
    return;
  }
  navigate(to, { replace: true, state: { ...savedState(kind).state, ...(openedFromList(state) ? FROM_LIST : {}) } });
}
