import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { SNOW_COUNT, SNOW_FALL, SNOW_TOP, snowFlake } from "./snowfall";

describe("winter snow", () => {
  it("keeps every flake over the lake and its shore, between the treetops and the ground", () => {
    for (let i = 0; i < SNOW_COUNT; i += 7) {
      for (const time of [0, 3.3, 41]) {
        const flake = snowFlake(i, time);
        expect(flake.y).toBeGreaterThanOrEqual(0);
        expect(flake.y).toBeLessThanOrEqual(SNOW_TOP);
        expect(Math.abs(flake.x)).toBeLessThan(LAKE_RX + 7);
        expect(Math.abs(flake.z - LAKE_CENTER_Z)).toBeLessThan(LAKE_RZ + 7);
      }
    }
  });

  it("drifts down slower than rain, and loops back to the top", () => {
    const a = snowFlake(5, 10);
    const b = snowFlake(5, 10.5);
    const fell = a.y - b.y;
    if (fell > 0) {
      expect(fell / 0.5).toBeGreaterThanOrEqual(SNOW_FALL[0] - 0.01);
      expect(fell / 0.5).toBeLessThanOrEqual(SNOW_FALL[1] + 0.01);
    }
    const heights = Array.from({ length: 200 }, (_, n) => snowFlake(5, n * 0.25).y);
    expect(Math.max(...heights)).toBeGreaterThan(SNOW_TOP * 0.9);
    expect(Math.min(...heights)).toBeLessThan(SNOW_TOP * 0.1);
  });

  it("spreads the flakes out rather than stacking them", () => {
    const spots = new Set(Array.from({ length: 60 }, (_, i) => {
      const flake = snowFlake(i, 0);
      return `${Math.round(flake.x)}:${Math.round(flake.z)}`;
    }));
    expect(spots.size).toBeGreaterThan(50);
  });
});
