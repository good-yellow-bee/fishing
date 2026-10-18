import { describe, expect, it } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";
import { SNOW_CAP, VISIT_EVERY_SEC, VISIT_SEC, robinAt, robinOut } from "./robinVisit";
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
});
