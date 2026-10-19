import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { BALE_RADIUS, hayBales } from "./hayField";
import { EWES, LAMB_MOTHERS, eweAt, lambAt, sheepOut } from "./sheepFlock";
import { LOOP_SEC, tractorOut } from "./tractorRun";

describe("sheep", () => {
  it("graze by day in spring and fall, never alongside the summer tractor", () => {
    expect(sheepOut("day", "clear", "spring")).toBe(true);
    expect(sheepOut("day", "overcast", "fall")).toBe(true);
    expect(sheepOut("day", "rain", "spring")).toBe(false);
    expect(sheepOut("dusk", "clear", "fall")).toBe(false);
    expect(sheepOut("day", "clear", "winter")).toBe(false);
    (["spring", "summer", "fall", "winter"] as const).forEach((season) => expect(sheepOut("day", "clear", season) && tractorOut("day", "clear", season)).toBe(false));
  });

  it("keep in front of the hills' face and clear of the bales, drifting slowly", () => {
    const bales = hayBales();
    for (let t = 0; t < LOOP_SEC * 2; t += 0.5) {
      const flock = [...EWES.map((_, i) => eweAt(i, t)), ...LAMB_MOTHERS.map((_, j) => lambAt(j, t))];
      flock.forEach((sheep) => {
        expect(sheep.z).toBeGreaterThan(hillFront(sheep.x, sheep.y)!);
        bales.forEach((bale) => expect(Math.hypot(sheep.x - bale.x, sheep.y - bale.y)).toBeGreaterThan(BALE_RADIUS + 0.2));
      });
      EWES.forEach((_, i) => expect(Math.abs(eweAt(i, t + 0.1).x - eweAt(i, t).x)).toBeLessThan(0.01));
    }
  });

  it("keeps lambs at their mothers' heels, skipping now and then", () => {
    const hops = Array.from({ length: 200 }, (_, k) => lambAt(0, k * 0.1).hop);
    expect(Math.max(...hops)).toBeGreaterThan(0.05);
    expect(Math.min(...hops)).toBe(0);
    const lamb = lambAt(1, 40);
    const mother = eweAt(LAMB_MOTHERS[1], 40);
    expect(Math.abs(lamb.x - mother.x)).toBeLessThan(0.4);
  });

  it("stand still under reduced motion", () => {
    expect(eweAt(2, 5, true)).toEqual(eweAt(2, 80, true));
    expect(lambAt(0, 0.2, true).hop).toBe(0);
  });
});
