import { describe, expect, it } from "vitest";
import { SWALLOW_COUNT, SWALLOW_HIGH, SWALLOW_LOW, swallowAt, swallowOverWater, swallowsOut } from "./swallowFlight";

describe("swallows", () => {
  it("fly on dry summer days in calm or light wind", () => {
    expect(swallowsOut("day", "clear", "summer", 0)).toBe(true);
    expect(swallowsOut("day", "partly-cloudy", "summer", 0.04)).toBe(true);
    expect(swallowsOut("day", "clear", "summer", 0.08)).toBe(false);
    expect(swallowsOut("day", "overcast", "summer", 0)).toBe(false);
    expect(swallowsOut("day", "rain", "summer", 0)).toBe(false);
    expect(swallowsOut("dusk", "clear", "summer", 0)).toBe(false);
    expect(swallowsOut("day", "clear", "spring", 0)).toBe(false);
  });

  it("stay over the lake, inside their height band, and skim the water now and then", () => {
    for (let i = 0; i < SWALLOW_COUNT; i += 1) {
      let lowest = Infinity;
      for (let t = 0; t < 90; t += 0.25) {
        const pose = swallowAt(i, t);
        expect(swallowOverWater(pose)).toBe(true);
        expect(pose.y).toBeGreaterThanOrEqual(SWALLOW_LOW - 1e-9);
        expect(pose.y).toBeLessThanOrEqual(SWALLOW_HIGH + 1e-9);
        lowest = Math.min(lowest, pose.y);
      }
      expect(lowest).toBeLessThan(0.3);
    }
  });

  it("glide still for reduced motion", () => {
    expect(swallowAt(1, 20, true)).toEqual(swallowAt(1, 0, true));
    expect(swallowAt(1, 20, true).flap).toBe(0);
  });
});
