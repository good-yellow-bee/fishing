import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { GUST_COUNT, GUST_CYCLE_SEC, gustAt, gustsOut } from "./gustPatch";

const breezy = { x: 0.08, z: 0 };

describe("cat's-paw gusts", () => {
  it("rise on breezy and strong days only", () => {
    expect(gustsOut(0)).toBe(false);
    expect(gustsOut(0.04)).toBe(false);
    expect(gustsOut(0.08)).toBe(true);
    expect(gustAt(0, 1, { x: 0.04, z: 0 })).toBeNull();
  });

  it("sweep downwind over the water and fade in and out", () => {
    let seen = 0;
    for (let i = 0; i < GUST_COUNT; i++) {
      for (let t = 0; t < GUST_CYCLE_SEC * 4; t += 0.1) {
        const a = gustAt(i, t, breezy);
        const b = gustAt(i, t + 0.1, breezy);
        if (!a) continue;
        seen++;
        expect(inLake(a.x, a.z)).toBe(true);
        expect(a.alpha).toBeGreaterThanOrEqual(0);
        expect(a.alpha).toBeLessThanOrEqual(1);
        if (b) expect(b.x).toBeGreaterThan(a.x);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
