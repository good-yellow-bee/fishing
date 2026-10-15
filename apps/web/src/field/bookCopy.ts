import { sampleLogbook, type Logbook } from "@stillwater/shared";

export const BOOK_COPY_STORAGE_KEY = "stillwater.field-log.copied.v1";

/** A book worth a first copy, and how many new catches make the last copy stale. */
export const FIRST_COPY_AT = 10;
export const COPY_AGAIN_AFTER = 25;

const SAMPLE_IDS = new Set(sampleLogbook(new Date()).catches.map((entry) => entry.id));

export function isSampleCatch(id: string) {
  return SAMPLE_IDS.has(id);
}

/** The player's own catches; the sample week's fish don't need a copy. */
export function ownCatches(book: Logbook) {
  return book.catches.filter((entry) => !SAMPLE_IDS.has(entry.id)).length;
}

export type CopyNudge = { kind: "never" } | { kind: "since"; count: number } | null;

/** Whether to remind the player to download a copy of the book, given their catches now and at the last download. */
export function copyNudge(own: number, copiedAt: number | null): CopyNudge {
  if (copiedAt === null) return own >= FIRST_COPY_AT ? { kind: "never" } : null;
  const since = own - copiedAt;
  return since >= COPY_AGAIN_AFTER ? { kind: "since", count: since } : null;
}

export function readCopiedAt(): number | null {
  try {
    const raw = localStorage.getItem(BOOK_COPY_STORAGE_KEY);
    if (raw === null) return null;
    const value = Number(JSON.parse(raw)?.catches);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveCopiedAt(own: number) {
  try {
    localStorage.setItem(BOOK_COPY_STORAGE_KEY, JSON.stringify({ catches: own, at: new Date().toISOString() }));
  } catch {
    // Only the reminder forgets; the download itself went through.
  }
}

/** A fresh start, as after restoring the sample: the next reminder is the first-copy one. */
export function clearCopiedAt() {
  try {
    localStorage.removeItem(BOOK_COPY_STORAGE_KEY);
  } catch {
    // Nothing kept, nothing to forget.
  }
}
