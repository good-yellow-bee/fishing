import { isLogbook, prepareStoredLogbook, salvageLogbook, type Logbook } from "@stillwater/shared";

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
  if (book) return book;
  keepUnreadable(raw);
  // One bad fish doesn't cost the rest: what reads is kept, and stored in place so the game adds to it too.
  const kept = salvageStored(raw);
  if (kept) {
    try {
      localStorage.setItem(LOGBOOK_STORAGE_KEY, JSON.stringify(kept));
    } catch {
      // Not stored: it is salvaged again on the next read.
    }
  }
  return kept;
}

/** What can be kept of a stored book that doesn't read as a whole, or null when nothing in it does. */
export function salvageStored(raw: string): Logbook | null {
  try {
    const book = salvageLogbook(prepareStoredLogbook(JSON.parse(raw) as unknown));
    return book && isLogbook(book) ? book : null;
  } catch {
    return null;
  }
}

/** The fish ids in the set-aside book: their photos are kept while it is, so a mended copy still finds them. */
export function setAsideCatchIds(): string[] {
  const raw = readUnreadableBook();
  if (!raw) return [];
  try {
    const book = JSON.parse(raw) as { catches?: unknown };
    if (!Array.isArray(book.catches)) return [];
    return book.catches.flatMap((entry: unknown) => {
      const id = typeof entry === "object" && entry !== null ? (entry as { id?: unknown }).id : undefined;
      return typeof id === "string" ? [id] : [];
    });
  } catch {
    return [];
  }
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

/** The book's line when storage is full: the bar under it offers the photos page, where most of the room goes. */
export const STORAGE_FULL = "The book could not be saved: this browser's storage is full.";

/** True for the error a browser throws when its storage for this site is full, by any of its names. */
export function isStorageFull(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22 || error.code === 1014;
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
