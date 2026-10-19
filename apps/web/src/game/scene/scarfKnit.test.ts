import { describe, expect, it } from "vitest";
import { WIND_DRIFT } from "@stillwater/shared";
import { SCARF_ENDS, knitsOut, scarfSway } from "./scarfKnit";

const STRONG = WIND_DRIFT.strong;

function range(i: number, local: { x: number; z: number }) {
  let low = Infinity;
  let high = -Infinity;
  let swing = 0;
  for (let t = 0; t < 30; t += 0.05) {
    const sway = scarfSway(i, t, local);
    low = Math.min(low, sway.lift);
    high = Math.max(high, sway.lift);
    swing += sway.swing;
  }
  return { low, high, swing };
}

describe("the angler's winter scarf", () => {
  it("is worn in winter only, with the dog's jumper", () => {
    expect(knitsOut("winter")).toBe(true);
    for (const season of ["spring", "summer", "fall"] as const) expect(knitsOut(season)).toBe(false);
  });

  it("hangs nearly still in a calm and streams out behind into a strong wind in the angler's face", () => {
    SCARF_ENDS.forEach((_, i) => {
      const calm = range(i, { x: 0, z: 0 });
      const faced = range(i, { x: 0, z: -STRONG });
      expect(calm.high - calm.low).toBeLessThan(0.15);
      expect(faced.low).toBeGreaterThan(calm.high);
      expect(faced.high - faced.low).toBeGreaterThan(calm.high - calm.low);
      expect(faced.high).toBeLessThan(Math.PI / 2);
    });
  });

  it("blows off to the side the wind goes, and stays against the back when it blows from behind", () => {
    SCARF_ENDS.forEach((_, i) => {
      expect(range(i, { x: STRONG, z: 0 }).swing).toBeGreaterThan(0);
      expect(range(i, { x: -STRONG, z: 0 }).swing).toBeLessThan(0);
      expect(range(i, { x: 0, z: STRONG }).high).toBeLessThan(range(i, { x: 0, z: -STRONG }).low);
    });
  });

  it("its two ends flap out of step", () => {
    const breezy = { x: 0, z: -WIND_DRIFT.breezy };
    expect(scarfSway(0, 3, breezy).lift).not.toBeCloseTo(scarfSway(1, 3, breezy).lift, 3);
  });
});
