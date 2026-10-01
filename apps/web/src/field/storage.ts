import { isLogbook, prepareStoredLogbook, type Logbook } from "@stillwater/shared";

export const LOGBOOK_STORAGE_KEY = "stillwater.field-log.v1";

export function readStoredLogbook(): Logbook | null {
  try {
    const raw = localStorage.getItem(LOGBOOK_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const book = prepareStoredLogbook(parsed);
    return isLogbook(book) ? book : null;
  } catch {
    return null;
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
