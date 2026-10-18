import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, inLake } from "@stillwater/shared";
import { POLLEN_RIM, POLLEN_STREAKS, pollenAmount, pollenHeading, pollenRim, pollenStreaks } from "./pollenDrift";

const EAST = { x: 0.08, z: 0 };
const CALM = { x: 0, z: 0 };

describe("spring pollen on the water", () => {
  it("lies only in spring, thinned by rain", () => {
    expect(pollenAmount("spring", "clear")).toBe(1);
    expect(pollenAmount("spring", "rain")).toBeGreaterThan(0);
    expect(pollenAmount("spring", "rain")).toBeLessThan(1);
    for (const season of ["summer", "fall", "winter"] as const) expect(pollenAmount(season, "clear")).toBe(0);
  });

  it("lines its streaks up with the breeze, all on the water", () => {
    const streaks = pollenStreaks(EAST);
    expect(streaks).toHaveLength(POLLEN_STREAKS);
    for (const streak of streaks) {
      for (const p of streak.points) expect(inLake(p.x, p.z)).toBe(true);
      const first = streak.points[0]!;
      const last = streak.points[streak.points.length - 1]!;
      // An east wind lays them out east-west.
      expect(Math.abs(last.x - first.x)).toBeGreaterThan(Math.abs(last.z - first.z));
    }
    expect(pollenStreaks(EAST)).toEqual(streaks);
  });

  it("gathers more streaks toward the downwind side", () => {
    const streaks = pollenStreaks(EAST, 40);
    const east = streaks.filter((s) => s.points[0]!.x > 0).length;
    expect(east).toBeGreaterThan(streaks.length - east);
  });

  it("piles thickest against the downwind bank, inside the water's edge", () => {
    const rim = pollenRim(EAST);
    expect(rim).toHaveLength(POLLEN_RIM);
    for (const puff of rim) expect(inLake(puff.x, puff.z)).toBe(true);
    const eastBank = rim.filter((p) => p.x > 15 && Math.abs(p.z - LAKE_CENTER_Z) < 6);
    const westBank = rim.filter((p) => p.x < -15 && Math.abs(p.z - LAKE_CENTER_Z) < 6);
    const thickest = (puffs: typeof rim) => Math.max(...puffs.map((p) => p.alpha));
    expect(thickest(eastBank)).toBeGreaterThan(thickest(westBank) * 2);
    // A calm day leaves an even thin rim.
    const calm = pollenRim(CALM);
    expect(new Set(calm.map((p) => p.alpha)).size).toBe(1);
  });

  it("drifts its slow calm-day way with no wind", () => {
    const head = pollenHeading(CALM);
    expect(Math.hypot(head.x, head.z)).toBeCloseTo(1, 2);
    expect(pollenHeading({ x: 0, z: -0.1 })).toEqual({ x: 0, z: -1 });
  });
});
