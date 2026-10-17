/** The fish, waters and outings deleted in this browser, so adding from an older copy of the book doesn't bring them back. */
export const DELETED_FISH_KEY = "stillwater.field-log.deleted.v1";

/** Enough for years of deletes; the oldest go first. */
const KEEP = 5000;

function read(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DELETED_FISH_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(DELETED_FISH_KEY, JSON.stringify(ids.slice(-KEEP)));
  } catch {
    // Only a guard for later merges; the delete itself is already saved.
  }
}

export function readDeletedFish(): Set<string> {
  return new Set(read());
}

export function noteDeletedFish(ids: readonly string[]) {
  if (ids.length === 0) return;
  const gone = new Set(ids);
  write([...read().filter((id) => !gone.has(id)), ...ids]);
}

/** An undone delete puts its fish back, so they are no longer kept out. */
export function forgetDeletedFish(ids: readonly string[]) {
  if (ids.length === 0) return;
  const back = new Set(ids);
  write(read().filter((id) => !back.has(id)));
}

/** Puts the deleted list back as it was, when a file load is undone. */
export function restoreDeletedFish(ids: readonly string[]) {
  write([...ids]);
}
