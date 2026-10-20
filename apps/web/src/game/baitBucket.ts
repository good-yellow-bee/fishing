/** Kept per angler, so another angler on the same browser starts with an empty bucket. */
export function baitBucketKey(userId: string) {
  return `stillwater.bucket.${userId}.v1`;
}
/** Spare live shiners the bucket keeps alive, beside the one on the hook. */
export const BUCKET_SIZE = 3;

export function loadBucket(userId: string): number {
  try {
    const kept = Number(localStorage.getItem(baitBucketKey(userId)));
    return Number.isInteger(kept) ? Math.min(BUCKET_SIZE, Math.max(0, kept)) : 0;
  } catch {
    return 0;
  }
}

export function saveBucket(userId: string, count: number) {
  try {
    if (count > 0) localStorage.setItem(baitBucketKey(userId), String(count));
    else localStorage.removeItem(baitBucketKey(userId));
  } catch {
    // A blocked store only means the bucket is empty on the next visit.
  }
}
