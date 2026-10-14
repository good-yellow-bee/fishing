import { describe, expect, it } from "vitest";
import { FLUFF_COUNT, FLUFF_CYCLE_SEC, FLUFF_LIFE_SEC, fluffOut, tuftAt } from "./cattailTufts";

describe("cattail fluff", () => {
  it("flies in late summer and fall, not in rain", () => {
    expect(fluffOut("summer", "clear")).toBe(true);
    expect(fluffOut("fall", "fog")).toBe(true);
    expect(fluffOut("spring", "clear")).toBe(false);
    expect(fluffOut("fall", "rain")).toBe(false);
  });

  it("lifts from a reed bed and fades in and out", () => {
    for (let i = 0; i < FLUFF_COUNT; i++) {
      let seen = 0;
      for (let t = 0; t < FLUFF_CYCLE_SEC; t += 0.25) {
        const tuft = tuftAt(i, t, { x: 0, z: 0 });
        if (!tuft) continue;
        seen += 0.25;
        expect(tuft.alpha).toBeGreaterThanOrEqual(0);
        expect(tuft.alpha).toBeLessThanOrEqual(1);
        expect(tuft.y).toBeGreaterThan(0.5);
      }
      expect(seen).toBeCloseTo(FLUFF_LIFE_SEC, 0);
    }
  });

  it("rides downwind, faster in a stronger wind", () => {
    const start = (wind: { x: number; z: number }) => {
      // Tuft 0 lifts from the first bed; find where it is late in a flight.
      for (let t = 0; t < FLUFF_CYCLE_SEC * 2; t += 0.05) {
        const a = tuftAt(0, t, wind);
        const b = tuftAt(0, t + 10, wind);
        if (a && b && a.alpha >= 1 && b.alpha >= 1) return { dx: b.x - a.x, dz: b.z - a.z };
      }
      throw new Error("no flight");
    };
    const light = start({ x: 0.04, z: 0 });
    const strong = start({ x: 0.13, z: 0 });
    expect(light.dx).toBeGreaterThan(0);
    expect(strong.dx).toBeGreaterThan(light.dx);
  });
});
