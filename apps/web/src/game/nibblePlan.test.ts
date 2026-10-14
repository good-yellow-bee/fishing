import { describe, expect, it } from "vitest";
import { nibblePlan } from "./nibblePlan";

function seeded(seed: number) {
  let s = (seed * 48271 + 12345) % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("nibble plan", () => {
  it("has no nibble when the wait is too short", () => {
    expect(nibblePlan(800, seeded(1))).toEqual([]);
  });

  it("always ends its nibbles well before the bite, in order and apart", () => {
    for (let seed = 1; seed < 300; seed += 1) {
      const wait = 1000 + (seed * 137) % 9000;
      const plan = nibblePlan(wait, seeded(seed));
      expect(plan.length).toBeGreaterThanOrEqual(1);
      expect(plan.length).toBeLessThanOrEqual(3);
      plan.forEach((n, k) => {
        expect(n.at).toBeGreaterThanOrEqual(0);
        expect(n.at + n.ms).toBeLessThanOrEqual(wait - 350);
        if (k > 0) expect(n.at).toBeGreaterThan(plan[k - 1]!.at + plan[k - 1]!.ms);
      });
    }
  });

  it("varies when the first nibble lands and how many come", () => {
    const firsts = new Set<number>();
    const counts = new Set<number>();
    for (let seed = 1; seed < 60; seed += 1) {
      const plan = nibblePlan(8000, seeded(seed));
      firsts.add(Math.round(plan[0]!.at / 500));
      counts.add(plan.length);
    }
    expect(firsts.size).toBeGreaterThan(3);
    expect(counts.size).toBe(3);
  });
});
