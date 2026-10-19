import { describe, expect, it } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";
import { SNOW_CAP, VISIT_EVERY_SEC, VISIT_SEC, robinAt, robinOut, robinVisit } from "./robinVisit";
import { DOCK_POST_CAPS } from "./snowyDock";

describe("dock robin", () => {
  it("comes by from dawn through the day, but not in the rain", () => {
    expect(robinOut("dawn", "clear")).toBe(true);
    expect(robinOut("day", "overcast")).toBe(true);
    expect(robinOut("dusk", "clear")).toBe(false);
    expect(robinOut("day", "rain")).toBe(false);
  });

  it("perches on the two front posts, in front of the angler, and on their snow in winter", () => {
    const perches = new Set<string>();
    for (let t = 0; t < VISIT_EVERY_SEC * 2; t += 0.25) {
      const bird = robinAt(t);
      if (!bird.here || bird.flying) continue;
      const cap = DOCK_POST_CAPS.find((c) => c.x === bird.x && c.z === bird.z);
      expect(cap).toBeDefined();
      expect(bird.y).toBe(cap!.y);
      expect(bird.z).toBeLessThan(DOCK_STAND_Z);
      perches.add(`${bird.x}`);
      expect(robinAt(t, true).y).toBeCloseTo(cap!.y + SNOW_CAP);
    }
    expect(perches.size).toBe(2);
    expect(Math.min(...[...perches].map((x) => Math.abs(Number(x) - DOCK_STAND_X)))).toBeGreaterThan(0.5);
  });

  it("flies smoothly in and out, and is gone between visits", () => {
    let gone = 0;
    for (let t = 0; t < VISIT_EVERY_SEC * 2; t += 1 / 30) {
      const a = robinAt(t);
      const b = robinAt(t + 1 / 30);
      if (!a.here) gone++;
      if (a.here && b.here) expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.35);
    }
    expect(gone / (VISIT_EVERY_SEC * 60)).toBeGreaterThan(1 - VISIT_SEC / VISIT_EVERY_SEC - 0.15);
  });

  it("holds still on the left post with reduced motion", () => {
    expect(robinAt(3, false, true)).toEqual(robinAt(40, false, true));
    expect(robinAt(3, false, true).here).toBe(true);
  });

  it("flies off from wherever it sits when the angler strikes, gone until its next visit, and keeps the first strike of a visit", () => {
    let landed = -1;
    for (let t = 0; t < VISIT_EVERY_SEC && landed < 0; t += 0.05) if (robinAt(t).here && !robinAt(t).flying) landed = t;
    for (const sat of [2, 12]) {
      const strike = landed + sat;
      const before = robinAt(strike);
      const off = robinAt(strike + 0.05, false, false, strike);
      expect(off.flying).toBe(1);
      expect(Math.hypot(off.x - before.x, off.y - before.y, off.z - before.z)).toBeLessThan(0.2);
      expect(robinAt(strike + 3, false, false, strike).here).toBe(false);
      expect(robinAt(landed + 16, false, false, strike).here).toBe(false);
      expect(robinAt(landed + VISIT_EVERY_SEC + 1, false, false, strike)).toEqual(robinAt(landed + VISIT_EVERY_SEC + 1));
    }
    expect(robinAt(landed + 1, false, false, landed - 40)).toEqual(robinAt(landed + 1));
    expect(robinAt(landed + 5, false, true, landed + 2)).toEqual(robinAt(landed + 5, false, true));
    expect(robinVisit(landed).index).toBe(robinVisit(landed + 15).index);
  });
});
