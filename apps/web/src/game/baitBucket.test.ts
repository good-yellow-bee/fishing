import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUCKET_LIFE_MS, baitBucketKey, loadBucket, saveBucket } from "./baitBucket";

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

  it("reads the count-only bucket from before as shiners put in now", () => {
    kept.set("stillwater.bucket.ash.v1", "2");
    expect(loadBucket("ash", 500)).toEqual({ shiners: [500, 500], died: 0 });
    expect(kept.has("stillwater.bucket.ash.v1")).toBe(false);
    saveBucket("ash", []);
    expect(kept.has(baitBucketKey("ash"))).toBe(false);
  });
});
