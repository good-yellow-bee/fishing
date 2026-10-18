/** The fish whose photos were removed in this browser, so adding from an older copy of the book doesn't bring them back. */
export const REMOVED_PHOTOS_KEY = "stillwater.field-log.removed-photos.v1";

/** Enough for years of making room; the oldest go first. */
const KEEP = 5000;

function read(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(REMOVED_PHOTOS_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(REMOVED_PHOTOS_KEY, JSON.stringify(ids.slice(-KEEP)));
  } catch {
    // Only a guard for later merges; the removal itself is already saved.
  }
}

export function readRemovedPhotos(): Set<string> {
  return new Set(read());
}

export function noteRemovedPhotos(ids: readonly string[]) {
  if (ids.length === 0) return;
  const gone = new Set(ids);
  write([...read().filter((id) => !gone.has(id)), ...ids]);
}

/** A fish given a photo again is no longer one whose photo stays out. */
export function forgetRemovedPhotos(ids: readonly string[]) {
  if (ids.length === 0) return;
  const back = new Set(ids);
  const held = read();
  if (held.some((id) => back.has(id))) write(held.filter((id) => !back.has(id)));
}

/** The list as it was before a load that was undone: the photos removed then stay out of later merges again. */
export function restoreRemovedPhotos(ids: readonly string[]) {
  write([...ids]);
}
