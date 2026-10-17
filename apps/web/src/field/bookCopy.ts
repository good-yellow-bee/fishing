import { sampleLogbook, type Logbook, type TackleItem } from "@stillwater/shared";
import { PLAY_LAKE_ID, offPlayLake } from "./playLake";

export const BOOK_COPY_STORAGE_KEY = "stillwater.field-log.copied.v1";

/** A book worth a first copy, and how many new catches make the last copy stale. */
export const FIRST_COPY_AT = 10;
export const COPY_AGAIN_AFTER = 25;
/** Days after which a copy of a book that changed since (an outing, an edit, a rename) is worth refreshing. */
export const COPY_AGAIN_DAYS = 30;

const SAMPLE_IDS = new Set(sampleLogbook(new Date()).catches.map((entry) => entry.id));

export function isSampleCatch(id: string) {
  return SAMPLE_IDS.has(id);
}

const SAMPLE_SPOT_IDS = new Set(sampleLogbook(new Date()).spots.map((spot) => spot.id));

/** Whether a water is one of the sample week's. */
export const isSampleSpot = (id: string) => SAMPLE_SPOT_IDS.has(id);
const SAMPLE_TRIP_IDS = new Set(sampleLogbook(new Date()).trips.map((trip) => trip.id));

/** Whether the book is still only the sample: its waters, outings and fish, and nothing of the player's own. The game's lake doesn't count either way. */
export function isSampleOnly(book: Logbook) {
  const spots = book.spots.filter((spot) => spot.id !== PLAY_LAKE_ID);
  return (
    spots.length > 0 &&
    spots.every((spot) => SAMPLE_SPOT_IDS.has(spot.id)) &&
    book.trips.filter(offPlayLake).every((trip) => SAMPLE_TRIP_IDS.has(trip.id)) &&
    book.catches.filter(offPlayLake).every((entry) => SAMPLE_IDS.has(entry.id))
  );
}

/** Whether any of the sample's invented waters is still in the book. */
export function hasSampleWaters(book: Logbook) {
  return book.spots.some((spot) => SAMPLE_SPOT_IDS.has(spot.id));
}

/** The player's own catches; the sample week's fish and the game's don't need a copy. */
export function ownCatches(book: Logbook) {
  return book.catches.filter((entry) => !SAMPLE_IDS.has(entry.id) && offPlayLake(entry)).length;
}

export type CopyNudge = { kind: "never" } | { kind: "since"; count: number } | { kind: "old"; days: number } | null;

/**
 * Whether to remind the player to download a copy of the book, given their catches now and at the last download, and
 * `changedDays`: the days since that download when the book has changed since, else null.
 */
export function copyNudge(own: number, copiedAt: number | null, changedDays: number | null = null): CopyNudge {
  if (copiedAt === null) return own >= FIRST_COPY_AT ? { kind: "never" } : null;
  const since = own - copiedAt;
  if (since >= COPY_AGAIN_AFTER) return { kind: "since", count: since };
  return own > 0 && changedDays !== null && changedDays >= COPY_AGAIN_DAYS ? { kind: "old", days: changedDays } : null;
}

/**
 * A short fingerprint of what a copy holds (the book, the tackle lists, which fish have photos, the year's goals), to
 * tell whether anything changed since a copy was made.
 */
export function bookSignature(book: Logbook, tackle: readonly TackleItem[] = [], photoIds: readonly string[] = [], goals: unknown = null): string {
  const text = JSON.stringify([book, tackle, [...photoIds].sort(), goals]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/** When the last copy was made and what the book was then; null when unknown (no copy, or one from before fingerprints). */
export function readCopyMark(): { at: number; sig: string } | null {
  try {
    const raw = localStorage.getItem(BOOK_COPY_STORAGE_KEY);
    if (raw === null) return null;
    const value = JSON.parse(raw) as { at?: unknown; sig?: unknown } | null;
    const at = typeof value?.at === "string" ? Date.parse(value.at) : NaN;
    return Number.isFinite(at) && typeof value?.sig === "string" ? { at, sig: value.sig } : null;
  } catch {
    return null;
  }
}

/** Days since the last copy when the book no longer reads as it did then, else null. */
export function changedDaysSince(mark: { at: number; sig: string } | null, sig: string, now = Date.now()): number | null {
  return mark && mark.sig !== sig ? Math.floor((now - mark.at) / (24 * 60 * 60 * 1000)) : null;
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

/**
 * Brings the count kept at the last download down to `own` when the book now counts fewer (fish deleted, or game fish
 * no longer counted as the angler's own), so the next fish logged count toward the reminder again. Leaves the rest be.
 */
export function lowerCopiedAt(own: number) {
  try {
    const raw = localStorage.getItem(BOOK_COPY_STORAGE_KEY);
    if (raw === null) return;
    const record = JSON.parse(raw);
    if (record && typeof record === "object" && Number(record.catches) > own) localStorage.setItem(BOOK_COPY_STORAGE_KEY, JSON.stringify({ ...record, catches: own }));
  } catch {
    // Only the reminder is late.
  }
}

export function saveCopiedAt(own: number, sig?: string) {
  try {
    localStorage.setItem(BOOK_COPY_STORAGE_KEY, JSON.stringify({ catches: own, at: new Date().toISOString(), ...(sig ? { sig } : {}) }));
  } catch {
    // Only the reminder forgets; the download itself went through.
  }
}

/** The copy record as stored, to put back whole when a file load is undone. */
export function readCopyRecord(): string | null {
  try {
    return localStorage.getItem(BOOK_COPY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function restoreCopyRecord(raw: string | null) {
  try {
    if (raw === null) localStorage.removeItem(BOOK_COPY_STORAGE_KEY);
    else localStorage.setItem(BOOK_COPY_STORAGE_KEY, raw);
  } catch {
    // Only the reminder forgets.
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
