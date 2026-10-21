import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AERATOR_EXTRA_MS, BUCKET_COLD_LIFE_MS, BUCKET_HOT_LIFE_MS, BUCKET_LIFE_MS, baitBucketKey, bucketLifeMs, liveShiners, loadBucket, saveBucket } from "./baitBucket";

let kept: Map<string, string>;
beforeEach(() => {
  kept = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => kept.set(key, value), removeItem: (key: string) => kept.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());

describe("the bait bucket", () => {
  it("keeps each spare shiner for three days, oldest first, and says how many died", () => {
    saveBucket("ash", [0, 10, BUCKET_LIFE_MS]);
    expect(loadBucket("ash", BUCKET_LIFE_MS + 5)).toEqual({ shiners: [10, BUCKET_LIFE_MS], died: 1 });
    expect(loadBucket("mara", 0)).toEqual({ shiners: [], died: 0 });
  });

  it("keeps them five days in winter's cold water and two in summer's heat, judged by the season now", () => {
    expect([bucketLifeMs("spring"), bucketLifeMs("fall"), bucketLifeMs(undefined)]).toEqual([BUCKET_LIFE_MS, BUCKET_LIFE_MS, BUCKET_LIFE_MS]);
    expect([BUCKET_HOT_LIFE_MS, BUCKET_LIFE_MS, BUCKET_COLD_LIFE_MS].map((ms) => ms / 86_400_000)).toEqual([2, 3, 5]);
    saveBucket("ash", [0, BUCKET_LIFE_MS]);
    expect(loadBucket("ash", BUCKET_LIFE_MS + 1, "winter")).toEqual({ shiners: [0, BUCKET_LIFE_MS], died: 0 });
    expect(loadBucket("ash", BUCKET_COLD_LIFE_MS + 1, "winter")).toEqual({ shiners: [BUCKET_LIFE_MS], died: 1 });
    expect(loadBucket("ash", BUCKET_HOT_LIFE_MS + 1, "summer")).toEqual({ shiners: [BUCKET_LIFE_MS], died: 1 });
    expect(loadBucket("ash", BUCKET_HOT_LIFE_MS + 1, "fall")).toEqual({ shiners: [0, BUCKET_LIFE_MS], died: 0 });
  });

  it("keeps the newest live ones when more were stored than it holds", () => {
    saveBucket("ash", [0, 1, 2, BUCKET_LIFE_MS * 2]);
    expect(loadBucket("ash", BUCKET_LIFE_MS * 2 + 1).shiners).toEqual([BUCKET_LIFE_MS * 2]);
  });

  it("reads the count-only bucket from before as shiners put in now", () => {
    kept.set("stillwater.bucket.ash.v1", "2");
    expect(loadBucket("ash", 500)).toEqual({ shiners: [500, 500], died: 0 });
    expect(kept.has("stillwater.bucket.ash.v1")).toBe(false);
    // Moved over, they are still there on the next visit.
    expect(loadBucket("ash", 600).shiners).toEqual([500, 500]);
    saveBucket("ash", []);
    expect(kept.has(baitBucketKey("ash"))).toBe(false);
  });

  it("keeps every spare shiner a day longer in any season once the aerator is fitted", () => {
    expect(AERATOR_EXTRA_MS / 86_400_000).toBe(1);
    expect((["summer", "spring", "fall", "winter", undefined] as const).map((season) => bucketLifeMs(season, true) / 86_400_000)).toEqual([3, 4, 4, 6, 4]);
    expect(liveShiners([0], BUCKET_LIFE_MS + AERATOR_EXTRA_MS, "fall", true)).toEqual([0]);
    expect(liveShiners([0], BUCKET_LIFE_MS + AERATOR_EXTRA_MS + 1, "fall", true)).toEqual([]);
    saveBucket("ash", [0, BUCKET_LIFE_MS]);
    expect(loadBucket("ash", BUCKET_HOT_LIFE_MS + 1, "summer", true)).toEqual({ shiners: [0, BUCKET_LIFE_MS], died: 0 });
    expect(loadBucket("ash", BUCKET_LIFE_MS + 1, "summer", true)).toEqual({ shiners: [BUCKET_LIFE_MS], died: 1 });
  });
});
