import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { DANCE_DOWN_SEC, DANCE_UP_SEC, MAYFLY_CLIMB, MAYFLY_COUNT, MAYFLY_LOW, MAYFLY_SWARMS, mayfly, swarmCenters } from "./mayflies";

describe("mayfly hatch", () => {
  it("puts its swarms over water each bank can reach", () => {
    for (const spot of ["dock", "reeds", "dropoff", "point", "inlet", "open"] as const) {
      const centers = swarmCenters(spot);
      expect(centers).toHaveLength(MAYFLY_SWARMS);
      for (const c of centers) expect(inLake(c.x, c.z)).toBe(true);
    }
  });

  it("dances between the low point and the top of the climb", () => {
    const centers = swarmCenters("dock");
    for (let i = 0; i < MAYFLY_COUNT; i += 7) {
      for (let t = 0; t < 4; t += 0.13) {
        const fly = mayfly(i, centers, t);
        expect(fly.y).toBeGreaterThanOrEqual(MAYFLY_LOW - 1e-9);
        expect(fly.y).toBeLessThanOrEqual(MAYFLY_LOW + MAYFLY_CLIMB + 1e-9);
      }
    }
  });

  it("climbs fast and comes down slow", () => {
    const centers = swarmCenters("dock");
    // Sample one fly densely and compare the steepest rise with the steepest fall.
    let up = 0;
    let down = 0;
    for (let t = 0; t < (DANCE_UP_SEC + DANCE_DOWN_SEC) * 2; t += 0.01) {
      const dy = mayfly(0, centers, t + 0.01).y - mayfly(0, centers, t).y;
      up = Math.max(up, dy);
      down = Math.max(down, -dy);
    }
    expect(up).toBeGreaterThan(down * 2);
  });

  it("holds still mid-dance with reduced motion", () => {
    const centers = swarmCenters("dock");
    expect(mayfly(4, centers, 1, true)).toEqual(mayfly(4, centers, 9, true));
  });
});
