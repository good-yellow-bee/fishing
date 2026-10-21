import { describe, expect, it } from "vitest";
import { WORM_TIN_WET } from "../wormTin";
import { TIN_WORMS_SHOWN, WORM_LIFT, WORM_SWAY, tinWorm } from "./tinWormPose";

describe("the worms curling over the worm tin's rim", () => {
  it("shows as many worms as the tin can hold, each over its own spot of the rim", () => {
    expect(TIN_WORMS_SHOWN).toBe(WORM_TIN_WET);
    const angles = Array.from({ length: TIN_WORMS_SHOWN }, (_, i) => tinWorm(i, 0).angle).sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i += 1) expect(angles[i] - angles[i - 1]).toBeGreaterThan(WORM_SWAY * 2);
  });

  it("hangs mostly toward the camera behind the angler", () => {
    for (let i = 0; i < TIN_WORMS_SHOWN; i += 1) expect(Math.sin(tinWorm(i, 3).angle)).toBeGreaterThan(-0.1);
  });

  it("wriggles slowly within a small lift and sway", () => {
    for (let i = 0; i < TIN_WORMS_SHOWN; i += 1) {
      const lifts = new Set<number>();
      for (let time = 0; time < 30; time += 0.5) {
        const worm = tinWorm(i, time);
        expect(Math.abs(worm.tilt)).toBeLessThanOrEqual(WORM_LIFT);
        expect(Math.abs(worm.angle - tinWorm(i, 0).angle)).toBeLessThanOrEqual(WORM_SWAY * 2);
        lifts.add(Math.round(worm.tilt * 100));
      }
      expect(lifts.size).toBeGreaterThan(5);
    }
  });
});
