/** One value kept for an angler in this browser under `key`: parsed on read, null when absent, broken or blocked. */
export function readAngler<T>(key: string, parse: (raw: unknown) => T | null): T | null {
  try {
    return parse(JSON.parse(localStorage.getItem(key) ?? "null"));
  } catch {
    return null;
  }
}

/** Keeps the value, or forgets it on null; a blocked store only means it is forgotten on the next visit. */
export function writeAngler<T>(key: string, value: T | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Blocked or full: the value lives only for this visit.
  }
}
