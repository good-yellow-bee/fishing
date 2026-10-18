import type { NavigateFunction } from "react-router-dom";
import { canGoBack, pageBefore } from "./FieldShell";
import { savedState, sayAfterBack, type SavedKind } from "./SavedNote";

/** The link state a list's card gives the page it opens, so a delete there can go back to the list. */
export const FROM_LIST = { fromList: true } as const;

/** The page a delete went Back from, so its Undo comes forward to it again rather than in the list's place. */
let leftBackFrom: string | null = null;
/** The page a delete was made on and the page it landed on, so an Undo pressed there takes its place, and one pressed elsewhere doesn't. */
let deletedOn: string | null = null;
let landedOn: string | null = null;

/**
 * After a delete, off the gone page: Back to the list it was opened from, so the list isn't in history twice; else
 * to `fallback` in the gone page's place, so Back never lands on it. Undo can put it back where it was either way.
 */
export function leaveDeleted(navigate: NavigateFunction, state: unknown, fallback: string) {
  // A link that gave no list state but came from the very page the delete would go to: Back there too.
  const fromList = canGoBack() && (openedFromList(state) || samePage(pageBefore(), fallback));
  leftBackFrom = fromList ? window.location.pathname + window.location.search : null;
  deletedOn = window.location.pathname + window.location.search;
  landedOn = fromList ? pageBefore() : fallback;
  if (fromList) navigate(-1);
  else navigate(fallback, { replace: true });
}

/** Whether the delete made from `from` went Back to its list. */
export function leftBackTo(from: string): boolean {
  return leftBackFrom === from;
}

/** Whether the angler has gone on to another page since the delete made on `from` landed: Undo then leaves `here` be. */
export function movedOnSince(from: string, here: string): boolean {
  return deletedOn === from && !samePage(landedOn, here);
}

function samePage(a: string | null, b: string): boolean {
  if (a === null) return false;
  const plain = (page: string) => {
    try {
      return decodeURI(page);
    } catch {
      return page;
    }
  };
  return plain(a) === plain(b);
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
