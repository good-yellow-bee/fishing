import { describe, expect, it } from "vitest";
import { DART_M, DART_SEC, STRIDER_COUNT, STRIDER_PATCH, patchOnWater, striderAt, stridersOut } from "./striderSkate";

describe("water striders", () => {
  it("skate on calm, dry water by daylight, outside winter", () => {
    expect(stridersOut("day", "clear", "summer", 0)).toBe(true);
    expect(stridersOut("dusk", "partly-cloudy", "fall", 0.02)).toBe(true);
    expect(stridersOut("day", "rain", "summer", 0)).toBe(false);
    expect(stridersOut("day", "clear", "winter", 0)).toBe(false);
    expect(stridersOut("night", "clear", "summer", 0)).toBe(false);
    expect(stridersOut("day", "clear", "summer", 0.2)).toBe(false);
  });

  it("keep their patch on open water", () => {
    expect(patchOnWater()).toBe(true);
  });

  it("rest, then dart a short way, never leaving the patch", () => {
    for (let i = 0; i < STRIDER_COUNT; i++) {
      let darts = 0;
      let last = striderAt(i, 0);
      for (let t = 0; t < 60; t += DART_SEC / 3) {
        const pose = striderAt(i, t);
        expect(Math.hypot(pose.x - STRIDER_PATCH.x, pose.z - STRIDER_PATCH.z)).toBeLessThanOrEqual(STRIDER_PATCH.r + DART_M * 1.5);
        // No jump between samples longer than a dart.
        expect(Math.hypot(pose.x - last.x, pose.z - last.z)).toBeLessThanOrEqual(DART_M * 1.5);
        if (pose.darting) darts++;
        last = pose;
      }
      expect(darts).toBeGreaterThan(0);
    }
  });

  it("holds still for reduced motion", () => {
    expect(striderAt(2, 5, true)).toEqual(striderAt(2, 40, true));
  });
});
