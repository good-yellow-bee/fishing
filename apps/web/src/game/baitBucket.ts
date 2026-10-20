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

/** When each spare shiner went in, oldest first, with the ones that have died left out, and how many those were. */
export function loadBucket(userId: string, now = Date.now()): { shiners: number[]; died: number } {
  const stored =
    readAngler(baitBucketKey(userId), (raw) => (Array.isArray(raw) ? raw.filter((at): at is number => typeof at === "number").slice(0, BUCKET_SIZE) : null)) ??
    readAngler(legacyBucketKey(userId), (raw) => (Number.isInteger(raw) ? Array.from({ length: Math.min(BUCKET_SIZE, Math.max(0, raw as number)) }, () => now) : null)) ??
    [];
  writeAngler(legacyBucketKey(userId), null);
  const shiners = stored.filter((at) => now - at <= BUCKET_LIFE_MS).sort((a, b) => a - b);
  return { shiners, died: stored.length - shiners.length };
}

export function saveBucket(userId: string, shiners: readonly number[]) {
  writeAngler(baitBucketKey(userId), shiners.length > 0 ? shiners : null);
}
