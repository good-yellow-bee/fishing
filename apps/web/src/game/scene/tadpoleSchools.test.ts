import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { SCHOOL_ROAM, SCHOOL_SPREAD, TADPOLES_PER_SCHOOL, TADPOLE_SCHOOLS, tadpoleSpot, tadpolesOut } from "./tadpoleSchools";

describe("spring tadpoles in the shallows", () => {
  it("come out in spring daylight only", () => {
    expect(tadpolesOut("spring", "day")).toBe(true);
    expect(tadpolesOut("spring", "dawn")).toBe(true);
    expect(tadpolesOut("spring", "night")).toBe(false);
    expect(tadpolesOut("summer", "day")).toBe(false);
    expect(tadpolesOut("winter", "day")).toBe(false);
  });

  it("stay in the water by their own shallows", () => {
    TADPOLE_SCHOOLS.forEach((home, school) => {
      for (let i = 0; i < TADPOLES_PER_SCHOOL; i += 1) {
        for (let t = 0; t < 300; t += 7.3) {
          const spot = tadpoleSpot(school, i, t);
          expect(inLake(spot.x, spot.z)).toBe(true);
          expect(Math.hypot(spot.x - home.x, spot.z - home.z)).toBeLessThanOrEqual(SCHOOL_ROAM * Math.hypot(1, 0.6) + SCHOOL_SPREAD + 1e-9);
        }
      }
    });
  });

  it("dart about and face the way they swim", () => {
    const a = tadpoleSpot(0, 3, 10);
    const b = tadpoleSpot(0, 3, 10.05);
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(0);
    // Wriggle aside, the head points along the swim.
    const heading = Math.atan2(b.x - a.x, b.z - a.z);
    expect(Math.cos(a.yaw - heading)).toBeGreaterThan(0.6);
  });

  it("hold still for reduced motion", () => {
    expect(tadpoleSpot(1, 5, 3, true)).toEqual(tadpoleSpot(1, 5, 90, true));
  });
});
