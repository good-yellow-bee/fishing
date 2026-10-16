import { isTackleBox, type TackleItem } from "@stillwater/shared";

export const TACKLE_STORAGE_KEY = "stillwater.tackle.v1";

/** Where stored tackle lists that could not be read are set aside, so the fresh lists saved next can't lose them. */
export const UNREADABLE_TACKLE_KEY = "stillwater.tackle.unreadable.v1";

export function readTackle(): TackleItem[] | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(TACKLE_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Read as unreadable below.
  }
  if (isTackleBox(parsed)) return parsed.items;
  try {
    // The first unreadable copy is the one with the angler's lists in it.
    if (localStorage.getItem(UNREADABLE_TACKLE_KEY) === null) localStorage.setItem(UNREADABLE_TACKLE_KEY, raw);
  } catch {
    // No room to set it aside; the lists are still read as missing.
  }
  return null;
}

export function readUnreadableTackle(): string | null {
  try {
    return localStorage.getItem(UNREADABLE_TACKLE_KEY);
  } catch {
    return null;
  }
}

export function forgetUnreadableTackle() {
  try {
    localStorage.removeItem(UNREADABLE_TACKLE_KEY);
  } catch {
    // Nothing to forget.
  }
}

export function saveTackle(items: TackleItem[]) {
  localStorage.setItem(TACKLE_STORAGE_KEY, JSON.stringify({ items }));
}
