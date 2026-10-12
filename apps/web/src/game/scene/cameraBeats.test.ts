import { describe, expect, it } from "vitest";
import {
  beatDistance,
  dollyStep,
  FIGHT_DISTANCE,
  fightDistance,
  LAND_DISTANCE,
  LAND_HOLD_SEC,
  landingDistance,
  landingFramed,
  landingWeight,
  RUN_DISTANCE,
  TIGHT_DISTANCE,
} from "./cameraBeats";
import { LIFT_START_AGE } from "./catchLift";

describe("camera beats", () => {
  it("leans in as the line tightens and backs off on a run", () => {
    expect(fightDistance(0, 0.2)).toBe(FIGHT_DISTANCE);
    expect(fightDistance(1, 0.95)).toBeCloseTo(TIGHT_DISTANCE);
    let last = Infinity;
    for (let tension = 0; tension <= 1; tension += 0.05) {
      const d = fightDistance(0, tension);
      expect(d).toBeLessThanOrEqual(last + 1e-9);
      last = d;
    }
    expect(fightDistance(2, 0.9)).toBe(RUN_DISTANCE);
  });

  it("never pushes the camera out past where the player left it", () => {
    expect(beatDistance(9, FIGHT_DISTANCE)).toBe(FIGHT_DISTANCE);
    expect(beatDistance(4, FIGHT_DISTANCE)).toBe(4);
    for (let age = LIFT_START_AGE; age < LAND_HOLD_SEC + 2; age += 0.05) {
      expect(landingDistance(3.6, age)).toBeCloseTo(3.6);
      expect(landingDistance(10, age)).toBeLessThanOrEqual(10);
      expect(landingDistance(10, age)).toBeGreaterThanOrEqual(LAND_DISTANCE);
    }
  });

  it("frames the landing from the lift, holds the portrait, then hands back", () => {
    expect(landingWeight(LIFT_START_AGE - 0.01)).toBe(0);
    expect(landingWeight(LIFT_START_AGE + 0.25)).toBeGreaterThan(0);
    expect(landingWeight(LIFT_START_AGE + 0.25)).toBeLessThan(1);
    expect(landingWeight(LAND_HOLD_SEC - 0.01)).toBe(1);
    expect(landingDistance(10, LAND_HOLD_SEC - 0.01)).toBe(LAND_DISTANCE);
    expect(landingFramed(LAND_HOLD_SEC + 0.3)).toBe(true);
    expect(landingFramed(LAND_HOLD_SEC + 0.6)).toBe(false);
    expect(landingDistance(10, LAND_HOLD_SEC + 0.6)).toBe(10);
  });

  it("eases toward the target without overshooting, at any frame rate", () => {
    for (const delta of [1 / 120, 1 / 30, 0.4]) {
      let d = 10;
      for (let i = 0; i < 200; i += 1) {
        const next = dollyStep(d, 5, delta);
        expect(next).toBeLessThanOrEqual(d);
        expect(next).toBeGreaterThanOrEqual(5);
        d = next;
      }
    }
  });
});
