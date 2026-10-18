import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { FEATHER_COUNT, FEATHER_CYCLE_SEC, featherAt, feathersOut } from "./featherDrift";

const EAST = { x: 0.06, z: 0 };

describe("moulted swan feathers", () => {
  it("float from summer into fall", () => {
    expect(feathersOut("summer")).toBe(true);
    expect(feathersOut("fall")).toBe(true);
    expect(feathersOut("spring")).toBe(false);
    expect(feathersOut("winter")).toBe(false);
  });

  it("lie on the water, and most are out at any moment", () => {
    for (const time of [0, 13, 61, 400]) {
      const afloat = Array.from({ length: FEATHER_COUNT }, (_, i) => featherAt(i, time, EAST)).filter((f) => f && f.size > 0);
      expect(afloat.length).toBeGreaterThanOrEqual(FEATHER_COUNT - 3);
      for (const f of afloat) expect(inLake(f!.x, f!.z)).toBe(true);
    }
  });

  it("drift downwind, faster in a stronger wind", () => {
    const moved = (wind: { x: number; z: number }) => {
      let sum = 0;
      for (let i = 0; i < FEATHER_COUNT; i += 1) {
        const a = featherAt(i, 100, wind);
        const b = featherAt(i, 105, wind);
        if (a && b && Math.abs(a.x - b.x) < 2) sum += b.x - a.x;
      }
      return sum;
    };
    expect(moved(EAST)).toBeGreaterThan(0);
    expect(moved({ x: 0.12, z: 0 })).toBeGreaterThan(moved(EAST));
    expect(moved({ x: -0.06, z: 0 })).toBeLessThan(0);
  });

  it("fade in and out at the ends of a run rather than popping", () => {
    const sizes = Array.from({ length: 200 }, (_, k) => featherAt(0, (k / 200) * FEATHER_CYCLE_SEC * 2, { x: 0, z: 0 })?.size ?? 0);
    expect(Math.min(...sizes)).toBeLessThan(0.2);
    expect(Math.max(...sizes)).toBe(1);
  });
});
