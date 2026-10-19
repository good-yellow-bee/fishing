import { describe, expect, it } from "vitest";
import { WIND_DRIFT } from "@stillwater/shared";
import { SCARF_ENDS, scarfOut, scarfSway } from "./scarfKnit";

function range(i: number, drift: number) {
  let low = Infinity;
  let high = -Infinity;
  for (let t = 0; t < 30; t += 0.05) {
    const { lift } = scarfSway(i, t, drift);
    low = Math.min(low, lift);
    high = Math.max(high, lift);
  }
  return { low, high };
}

describe("the angler's winter scarf", () => {
  it("is worn in winter only", () => {
    expect(scarfOut("winter")).toBe(true);
    for (const season of ["spring", "summer", "fall"] as const) expect(scarfOut(season)).toBe(false);
  });

  it("hangs nearly still in a calm and streams out, flapping, on a strong day", () => {
    SCARF_ENDS.forEach((_, i) => {
      const calm = range(i, 0);
      const strong = range(i, WIND_DRIFT.strong);
      expect(calm.high - calm.low).toBeLessThan(0.15);
      expect(strong.low).toBeGreaterThan(calm.high);
      expect(strong.high - strong.low).toBeGreaterThan(calm.high - calm.low);
      // Never blown up past level with the shoulders.
      expect(strong.high).toBeLessThan(Math.PI / 2);
    });
  });

  it("its two ends flap out of step, and hang at rest with reduced motion", () => {
    expect(scarfSway(0, 3, WIND_DRIFT.breezy).lift).not.toBeCloseTo(scarfSway(1, 3, WIND_DRIFT.breezy).lift, 3);
    expect(scarfSway(0, 3, WIND_DRIFT.breezy, true)).toEqual(scarfSway(0, 40, WIND_DRIFT.breezy, true));
  });
});
