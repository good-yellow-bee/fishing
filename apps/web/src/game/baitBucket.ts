import { readAngler, writeAngler } from "./anglerStore";

/** Kept per angler, so another angler on the same browser starts with an empty bucket. */
export function baitBucketKey(userId: string) {
  return `stillwater.bucket.${userId}.v2`;
}
/** The count-only bucket from before each shiner kept its own time; read once into the new one as shiners put in now. */
function legacyBucketKey(userId: string) {
  return `stillwater.bucket.${userId}.v1`;
}
/** Spare live shiners the bucket keeps alive, beside the one on the hook. */
export const BUCKET_SIZE = 3;
/** A spare shiner lives this long in the bucket; past it, it has died. */
export const BUCKET_LIFE_MS = 72 * 3_600_000;

/** The spare shiners still alive at `now`, oldest first, no more than the bucket holds. */
export function liveShiners(shiners: readonly number[], now: number): number[] {
  return shiners.filter((at) => now - at <= BUCKET_LIFE_MS).sort((a, b) => a - b).slice(-BUCKET_SIZE);
}

/** When each spare shiner went in, oldest first, with the ones that have died left out, and how many those were. */
export function loadBucket(userId: string, now = Date.now()): { shiners: number[]; died: number } {
  const stored = readAngler(baitBucketKey(userId), (raw) => (Array.isArray(raw) ? raw.filter((at): at is number => typeof at === "number") : null));
  if (stored) {
    const shiners = liveShiners(stored, now);
    return { shiners, died: Math.max(0, Math.min(stored.length, BUCKET_SIZE) - shiners.length) };
  }
  // The bucket from before each shiner kept its time moves over once, its shiners counted as put in now.
  const legacy = readAngler(legacyBucketKey(userId), (raw) => (Number.isInteger(raw) ? Math.min(BUCKET_SIZE, Math.max(0, raw as number)) : null));
  if (legacy === null) return { shiners: [], died: 0 };
  const shiners = Array.from({ length: legacy }, () => now);
  saveBucket(userId, shiners);
  writeAngler(legacyBucketKey(userId), null);
  return { shiners, died: 0 };
}

export function saveBucket(userId: string, shiners: readonly number[]) {
  writeAngler(baitBucketKey(userId), shiners.length > 0 ? shiners : null);
}
