import { describe, expect, it } from "vitest";
import { BACKLASH_POWER, SLAP_POWER, sweetBand } from "../logic";
import { castRing, castRingRadius } from "./castRing";

describe("cast ring on the water", () => {
  it("grows steadily with power", () => {
    let last = -Infinity;
    for (let p = 0; p <= 1; p += 0.05) {
      const r = castRingRadius(p);
      expect(r).toBeGreaterThan(last);
      last = r;
    }
    expect(castRingRadius(0)).toBeCloseTo(0.4);
    expect(castRingRadius(1)).toBeCloseTo(1.3);
  });

  it("turns moss exactly inside the sweet band at every accuracy", () => {
    for (const accuracy of [1, 3, 5, 8]) {
      const band = sweetBand(accuracy);
      for (let p = 0; p <= 1; p += 0.01) {
        expect(castRing(p, band).inBand).toBe(p >= band.min && p <= band.max && p <= BACKLASH_POWER);
      }
    }
  });

  it("warns at a dock slap and a backlash", () => {
    const band = sweetBand(1);
    expect(castRing(SLAP_POWER - 0.01, band).tone).toBe("weak");
    expect(castRing(BACKLASH_POWER + 0.01, band).tone).toBe("over");
    expect(castRing(0, band).opacity).toBe(0);
    expect(castRing(0.5, band).opacity).toBeGreaterThan(0);
  });
});
