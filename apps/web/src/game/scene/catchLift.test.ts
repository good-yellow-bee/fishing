import { describe, expect, it } from "vitest";
import { LIFT_DEPTH, LIFT_SEC, LIFT_START_AGE, liftDepth, liftFlop } from "./catchLift";
import { landExitSplash, landFlop, landRodPitch, landSwing } from "./landMotion";

describe("landing lift", () => {
  it("rises from under the chop to the surface, faster as it comes", () => {
    expect(liftDepth(LIFT_START_AGE)).toBeCloseTo(LIFT_DEPTH);
    let last = Infinity;
    let lastStep = 0;
    for (let age = LIFT_START_AGE; age < 0; age += LIFT_SEC / 10) {
      const depth = liftDepth(age);
      expect(depth).toBeLessThan(last + 1e-9);
      if (last !== Infinity) {
        expect(last - depth).toBeGreaterThanOrEqual(lastStep - 1e-9);
        lastStep = last - depth;
      }
      last = depth;
    }
    expect(liftDepth(0)).toBe(0);
    expect(liftDepth(1)).toBe(0);
  });

  it("holds the swing and the exit ring until the fish breaks the surface", () => {
    for (const age of [LIFT_START_AGE, -0.2, -0.01]) {
      expect(landSwing(age)).toBe(0);
      expect(landExitSplash(age)).toBe(-1);
      expect(landRodPitch(age, 0.4)).toBe(0.4);
      expect(liftFlop(age)).toBeGreaterThan(landFlop(age));
    }
    expect(landExitSplash(0)).toBe(0);
    expect(landSwing(0.3)).toBeGreaterThan(0);
  });
});
