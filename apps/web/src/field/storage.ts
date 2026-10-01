import { isLogbook, type Logbook } from "@stillwater/shared";

const KEY = "stillwater.field-log.v1";

export function readStoredLogbook(): Logbook | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLogbook(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLogbook(book: Logbook) {
  localStorage.setItem(KEY, JSON.stringify(book));
}
