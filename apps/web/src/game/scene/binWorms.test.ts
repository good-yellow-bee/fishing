import { describe, expect, it } from "vitest";
import { BIN_INSIDE, BIN_WORMS, RISE_MAX, RISE_MIN, WORM_LEAN, binWorm } from "./binWorms";

describe("the worms in the shack's worm bin", () => {
  it("each comes up at its own spot inside the crate", () => {
    const spots = Array.from({ length: BIN_WORMS }, (_, i) => binWorm(i, 0));
    for (const worm of spots) {
      expect(Math.abs(worm.x)).toBeLessThan(BIN_INSIDE.width / 2);
      expect(Math.abs(worm.z)).toBeLessThan(BIN_INSIDE.depth / 2);
    }
    for (let i = 0; i < spots.length; i += 1)
      for (let j = i + 1; j < spots.length; j += 1) expect(Math.hypot(spots[i]!.x - spots[j]!.x, spots[i]!.z - spots[j]!.z)).toBeGreaterThan(0.05);
  });

  it("rises and sinks back slowly within a small lean, staying at its spot", () => {
    for (let i = 0; i < BIN_WORMS; i += 1) {
      const rises = new Set<number>();
      for (let time = 0; time < 40; time += 0.5) {
        const worm = binWorm(i, time);
        expect(worm.rise).toBeGreaterThanOrEqual(RISE_MIN);
        expect(worm.rise).toBeLessThanOrEqual(RISE_MAX);
        expect(Math.abs(worm.lean)).toBeLessThanOrEqual(WORM_LEAN);
        expect([worm.x, worm.z]).toEqual([binWorm(i, 0).x, binWorm(i, 0).z]);
        rises.add(Math.round(worm.rise * 20));
      }
      expect(rises.size).toBeGreaterThan(5);
    }
  });

  it("never moves all together", () => {
    const rises = Array.from({ length: BIN_WORMS }, (_, i) => binWorm(i, 5).rise);
    expect(new Set(rises.map((rise) => rise.toFixed(2))).size).toBe(BIN_WORMS);
  });
});
