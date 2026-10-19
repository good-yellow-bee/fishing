import { describe, expect, it } from "vitest";
import { COWS } from "./cowGraze";
import { FARM_AT } from "./farmstead";
import { PAIR, nestAt, storkAt, storksOut } from "./storkNest";

describe("the barn storks", () => {
  it("are home from spring through summer, leaving the nest empty in fall and winter", () => {
    expect(storksOut("spring")).toBe(true);
    expect(storksOut("summer")).toBe(true);
    expect(storksOut("fall")).toBe(false);
    expect(storksOut("winter")).toBe(false);
  });

  it("nest on the barn's roof, above the farm's ground and clear of the grazing cows", () => {
    const nest = nestAt();
    expect(nest.y).toBeGreaterThan(FARM_AT.y + 1);
    COWS.forEach((cow) => expect(Math.abs(cow.x - nest.x)).toBeGreaterThan(cow.reach + 1));
  });

  it("clatter now and then, one at a time, and only the standing one stretches its wings", () => {
    let clattering = 0;
    let both = 0;
    let stretched = 0;
    for (let t = 0; t < 120; t += 0.1) {
      const [a, b] = PAIR.map((_, i) => storkAt(i, t));
      if (a!.headBack > 0.5 || b!.headBack > 0.5) clattering += 1;
      if (a!.headBack > 0.5 && b!.headBack > 0.5) both += 1;
      if (a!.spread > 0.5) stretched += 1;
      expect(b!.spread).toBe(0);
    }
    expect(clattering).toBeGreaterThan(20);
    expect(clattering).toBeLessThan(400);
    expect(both).toBe(0);
    expect(stretched).toBeGreaterThan(5);
    expect(storkAt(0, 5, true)).toEqual({ headBack: 0, rattle: 0, spread: 0, yaw: 0.4 });
  });
});
