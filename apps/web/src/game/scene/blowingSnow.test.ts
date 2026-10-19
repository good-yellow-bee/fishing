import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { HILL_WISPS, LIFTS, WISPS, driftSide, spindriftOut, spindriftStrength, wispAt } from "./blowingSnow";
import { hillFront } from "./farHills";

const STRONG = { x: 0.12, z: 0.04 };

describe("spindrift", () => {
  it("blows on winter mornings and days with wind enough, not in falling snow or fog", () => {
    expect(spindriftOut("day", "clear", "winter", STRONG)).toBe(true);
    expect(spindriftOut("dawn", "overcast", "winter", { x: 0, z: -0.08 })).toBe(true);
    expect(spindriftOut("day", "clear", "winter", { x: 0.04, z: 0 })).toBe(false);
    expect(spindriftOut("day", "rain", "winter", STRONG)).toBe(false);
    expect(spindriftOut("day", "fog", "winter", STRONG)).toBe(false);
    expect(spindriftOut("night", "clear", "winter", STRONG)).toBe(false);
    expect(spindriftOut("day", "clear", "fall", STRONG)).toBe(false);
    expect(spindriftStrength({ x: LIFTS, z: 0 })).toBeGreaterThan(0.2);
    expect(spindriftStrength({ x: 0.13, z: 0 })).toBe(1);
  });

  it("races downwind, east when the wind is straight along the lake", () => {
    expect(driftSide({ x: -0.1, z: 0 })).toBe(-1);
    expect(driftSide({ x: 0, z: 0.1 })).toBe(1);
    for (const wind of [STRONG, { x: -0.12, z: 0 }]) {
      for (let i = 0; i < WISPS; i += 1) {
        for (let t = 0; t < 30; t += 0.1) {
          const a = wispAt(i, t, wind);
          const b = wispAt(i, t + 0.1, wind);
          if (!a || !b) continue;
          expect(Math.sign(b.x - a.x)).toBe(driftSide(wind));
          expect(Math.abs(b.x - a.x)).toBeLessThan(1);
        }
      }
    }
  });

  it("streams along the hills' faces and skims the far shore, never over the water", () => {
    let seen = 0;
    for (let i = 0; i < WISPS; i += 1) {
      for (let t = 0; t < 40; t += 0.25) {
        const wisp = wispAt(i, t, STRONG);
        if (!wisp) continue;
        seen += 1;
        expect(inLake(wisp.x, wisp.z)).toBe(false);
        if (i < HILL_WISPS) expect(wisp.z).toBeGreaterThan(hillFront(wisp.x, wisp.y)!);
        else expect(wisp.y).toBeLessThan(0.5);
        expect(wisp.thick).toBeGreaterThanOrEqual(0);
      }
    }
    expect(seen).toBeGreaterThan(WISPS * 40);
  });

  it("holds still with reduced motion", () => {
    expect(wispAt(3, 1, STRONG, true)).toEqual(wispAt(3, 20, STRONG, true));
  });
});
