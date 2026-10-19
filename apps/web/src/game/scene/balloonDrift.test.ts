import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { BALLOON_EVERY_SEC, BASKET_KISS, BURN_EVERY_SEC, BURN_SEC, CALMEST, CROSS_SEC, balloonAt, balloonOut } from "./balloonDrift";

const CALM = { x: 0.01, z: 0 };

describe("hot-air balloon", () => {
  it("flies only on still clear dawns in spring and summer", () => {
    expect(balloonOut("dawn", "clear", "summer", CALM)).toBe(true);
    expect(balloonOut("dawn", "partly-cloudy", "spring", CALM)).toBe(true);
    expect(balloonOut("day", "clear", "summer", CALM)).toBe(false);
    expect(balloonOut("dawn", "rain", "summer", CALM)).toBe(false);
    expect(balloonOut("dawn", "fog", "summer", CALM)).toBe(false);
    expect(balloonOut("dawn", "clear", "fall", CALM)).toBe(false);
    expect(balloonOut("dawn", "clear", "summer", { x: CALMEST, z: 0.01 })).toBe(false);
  });

  it("crosses the far half of the lake smoothly, never below the water and high over the banks, then leaves the sky empty", () => {
    let last = balloonAt(0, CALM)!;
    let lowest = Infinity;
    for (let t = 0.25; t < CROSS_SEC; t += 0.25) {
      const at = balloonAt(t, CALM)!;
      expect(at.z).toBeLessThan(-7);
      expect(at.y).toBeGreaterThanOrEqual(BASKET_KISS - 1e-9);
      if (!inLake(at.x, at.z)) expect(at.y).toBeGreaterThan(5);
      lowest = Math.min(lowest, at.y);
      expect(Math.hypot(at.x - last.x, at.y - last.y, at.z - last.z)).toBeLessThan(0.2);
      last = at;
    }
    // Mid-lake it dips to touch the water.
    expect(lowest).toBeCloseTo(BASKET_KISS, 2);
    expect(balloonAt(CROSS_SEC + 1, CALM)).toBeNull();
    expect(balloonAt(BALLOON_EVERY_SEC - 1, CALM)).toBeNull();
    expect(balloonAt(BALLOON_EVERY_SEC + 1, CALM)).not.toBeNull();
  });

  it("drifts the way the breeze goes", () => {
    expect(balloonAt(10, CALM)!.x).toBeLessThan(balloonAt(20, CALM)!.x);
    const east = { x: -0.02, z: 0 };
    expect(balloonAt(10, east)!.x).toBeGreaterThan(balloonAt(20, east)!.x);
  });

  it("fires the burner in short bursts, and holds it unlit and mid-sky when motion is reduced", () => {
    expect(balloonAt(BURN_SEC / 2, CALM)!.flame).toBeCloseTo(1);
    expect(balloonAt(BURN_EVERY_SEC - 1, CALM)!.flame).toBe(0);
    const held = balloonAt(5, CALM, true)!;
    expect(held).toEqual(balloonAt(80, CALM, true));
    expect(held.flame).toBe(0);
  });
});
