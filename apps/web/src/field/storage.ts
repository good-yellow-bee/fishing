import { isLogbook, prepareStoredLogbook, type Logbook } from "@stillwater/shared";

export const LOGBOOK_STORAGE_KEY = "stillwater.field-log.v1";

/** Where a stored book that could not be read is set aside, so nothing written after it can lose it. */
export const UNREADABLE_BOOK_KEY = "stillwater.field-log.unreadable.v1";

function parseStored(raw: string): Logbook | null {
  try {
    const book = prepareStoredLogbook(JSON.parse(raw) as unknown);
    return isLogbook(book) ? book : null;
  } catch {
    return null;
  }
}

export function readStoredLogbook(): Logbook | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LOGBOOK_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  const book = parseStored(raw);
  if (!book) keepUnreadable(raw);
  return book;
}

/** True when a book is stored here but could not be read: its photos are left alone. */
export function storedBookUnreadable(): boolean {
  try {
    const raw = localStorage.getItem(LOGBOOK_STORAGE_KEY);
    return raw !== null && raw !== "" && parseStored(raw) === null;
  } catch {
    return false;
  }
}

function keepUnreadable(raw: string) {
  try {
    // The first unreadable book is the one with the player's fish in it; a later one is a fresh start on top.
    if (localStorage.getItem(UNREADABLE_BOOK_KEY) === null) localStorage.setItem(UNREADABLE_BOOK_KEY, raw);
  } catch {
    // No room to set it aside; the book is still read as missing.
  }
}

export function readUnreadableBook(): string | null {
  try {
    return localStorage.getItem(UNREADABLE_BOOK_KEY);
  } catch {
    return null;
  }
}

export function forgetUnreadableBook() {
  try {
    localStorage.removeItem(UNREADABLE_BOOK_KEY);
  } catch {
    // Nothing to forget.
  }
}

export function saveLogbook(book: Logbook) {
  const json = JSON.stringify(book);
  const previous = localStorage.getItem(LOGBOOK_STORAGE_KEY);
  try {
    localStorage.setItem(LOGBOOK_STORAGE_KEY, json);
  } catch (error) {
    if (previous !== null) {
      try {
        localStorage.setItem(LOGBOOK_STORAGE_KEY, previous);
      } catch {
        throw error;
      }
    }
    throw error;
  }
}
