import { describe, expect, it } from "vitest";
import { BAT_COUNT, BAT_HIGH, BAT_LOW, batAt, batOverWater, batsOut } from "./batFlight";

describe("bats", () => {
  it("come out on summer dusks and nights and dry spring dusks", () => {
    expect(batsOut("dusk", "clear", "summer")).toBe(true);
    expect(batsOut("night", "partly-cloudy", "summer")).toBe(true);
    expect(batsOut("dusk", "clear", "spring")).toBe(true);
    expect(batsOut("night", "clear", "spring")).toBe(false);
    expect(batsOut("day", "clear", "summer")).toBe(false);
    expect(batsOut("dusk", "rain", "summer")).toBe(false);
    expect(batsOut("dusk", "clear", "fall")).toBe(false);
    expect(batsOut("night", "clear", "winter")).toBe(false);
  });

  it("stay over the water and inside their height band", () => {
    for (let i = 0; i < BAT_COUNT; i += 1) {
      for (let t = 0; t < 120; t += 0.7) {
        const pose = batAt(i, t);
        expect(batOverWater(pose)).toBe(true);
        expect(pose.y).toBeGreaterThanOrEqual(BAT_LOW - 1e-9);
        expect(pose.y).toBeLessThanOrEqual(BAT_HIGH + 1e-9);
      }
    }
  });

  it("move and flap, but glide still for reduced motion", () => {
    expect(batAt(0, 3).x).not.toBeCloseTo(batAt(0, 5).x, 2);
    expect(batAt(2, 10, true)).toEqual({ ...batAt(2, 0, true) });
    expect(batAt(2, 10, true).flap).toBe(0);
  });
});
