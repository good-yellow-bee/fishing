import { describe, expect, it } from "vitest";
import { MAX_TILT, lilyRide } from "./LilyBed";
import { waterHeight } from "./water";

describe("lilyRide", () => {
  it("rides the water's surface where the pad floats", () => {
    for (const t of [0, 3.7, 12]) expect(lilyRide(-6, 3, t).y).toBe(waterHeight(-6, 3, t));
  });

  it("tilts with the slope of the swell, never more than a gentle lean", () => {
    let leaned = 0;
    for (let t = 0; t < 60; t += 0.25) {
      const ride = lilyRide(4, -6, t);
      expect(Math.abs(ride.rx)).toBeLessThanOrEqual(MAX_TILT);
      expect(Math.abs(ride.rz)).toBeLessThanOrEqual(MAX_TILT);
      leaned = Math.max(leaned, Math.abs(ride.rx), Math.abs(ride.rz));
    }
    expect(leaned).toBeGreaterThan(0);
  });
});
