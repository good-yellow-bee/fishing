import { describe, expect, it } from "vitest";
import { CLOUD_DRIFT, CLOUD_SHADOW_DARK, cloudBlobs, cloudScroll, cloudShadowStrength } from "./cloudShadow";

describe("cloud shadows", () => {
  it("lie on the water only on a clear day, softer under a low sun", () => {
    expect(cloudShadowStrength("day", "clear")).toBe(CLOUD_SHADOW_DARK);
    expect(cloudShadowStrength("dawn", "clear")).toBeLessThan(CLOUD_SHADOW_DARK);
    expect(cloudShadowStrength("night", "clear")).toBe(0);
    expect(cloudShadowStrength("day", "overcast")).toBe(0);
    expect(cloudShadowStrength("day", "rain")).toBe(0);
  });

  it("drift east on a still day and downwind on a windy one", () => {
    expect(cloudScroll({ x: 0, z: 0 })).toEqual({ x: -CLOUD_DRIFT, y: 0 });
    const north = cloudScroll({ x: 0, z: -0.13 });
    expect(north.y).toBeLessThan(0);
    expect(cloudScroll({ x: 0.08, z: 0 }).x).toBeLessThan(-CLOUD_DRIFT);
  });

  it("keeps the same blobs every visit, each inside its tile", () => {
    expect(cloudBlobs()).toEqual(cloudBlobs());
    for (const blob of cloudBlobs()) {
      expect(blob.x).toBeGreaterThanOrEqual(0);
      expect(blob.x).toBeLessThan(1);
      expect(blob.r).toBeLessThan(0.25);
    }
  });
});
