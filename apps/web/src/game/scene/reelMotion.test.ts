import { describe, expect, it } from "vitest";
import { retrieveHang } from "./fightMotion.ts";
import { SPOOL_GEAR, handleRadians, haulStep, spoolRadians } from "./reelMotion.ts";

function taken(pump: number, surge: 0 | 1 | 2 = 0) {
  return haulStep(0, pump, true, surge);
}

describe("reel crank", () => {
  it("turns the reel with the haul and holds it while the lure drops back", () => {
    const calm = retrieveHang(0, true, 0);
    expect(taken(0)).toBe(0);
    expect(taken(0.3)).toBeGreaterThan(calm * 0.4);
    expect(taken(0.3)).toBeLessThan(calm);
    expect(taken(0.62)).toBeCloseTo(calm, 2);
    expect(taken(0.99)).toBeCloseTo(taken(0.62), 2);
    expect(haulStep(0.7, 0.99, true, 0)).toBe(0);
    expect(taken(1.62)).toBeCloseTo(calm * 2, 2);
  });

  it("cranks less on a short haul and not at all on a run or a pause", () => {
    const calm = taken(0.62, 0);
    const heavy = taken(0.62, 1);
    expect(heavy).toBeCloseTo(retrieveHang(0, true, 1), 2);
    expect(heavy).toBeLessThan(calm * 0.25);
    expect(taken(0.62, 2)).toBe(0);
    expect(haulStep(0, 0.62, false, 0)).toBe(0);
    expect(haulStep(0.4, 0.4, true, 0)).toBe(0);
    expect(haulStep(0.8, 0.2, true, 0)).toBe(0);
  });

  it("matches a haul walked in small steps and gears the spool to that line", () => {
    let sum = 0;
    let prev = 0;
    for (let i = 1; i <= 31; i += 1) {
      const pump = (0.62 * i) / 31;
      sum += haulStep(prev, pump, true, 0);
      prev = pump;
    }
    const calm = retrieveHang(0, true, 0);
    expect(sum).toBeCloseTo(calm, 2);
    expect(handleRadians(0)).toBe(0);
    expect(handleRadians(calm)).toBeCloseTo(Math.PI * 2);
    expect(handleRadians(sum * 0.4)).toBeLessThan(Math.PI);
    expect(spoolRadians(calm)).toBeCloseTo(Math.PI * 2 * SPOOL_GEAR);
    expect(spoolRadians(calm)).toBeGreaterThan(handleRadians(calm) * 2);
  });
});
