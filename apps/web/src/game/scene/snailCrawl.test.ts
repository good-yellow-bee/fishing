import { describe, expect, it } from "vitest";
import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z } from "@stillwater/shared";
import { LOOP_SEC, snailAt, snailOut, trailAt } from "./snailCrawl";
import { CUP_SPOT, THERMOS_SPOT } from "./steamWisp";

describe("dock snail", () => {
  it("is out in the rain and on dewy mornings, from spring to fall", () => {
    expect(snailOut("day", "rain", "summer")).toBe(true);
    expect(snailOut("dawn", "clear", "spring")).toBe(true);
    expect(snailOut("day", "clear", "summer")).toBe(false);
    expect(snailOut("dawn", "rain", "winter")).toBe(false);
  });

  it("keeps to the planks behind the angler, clear of their feet, the thermos and the cup", () => {
    for (let t = 0; t < LOOP_SEC; t += 3) {
      const s = snailAt(t);
      expect(s.x).toBeGreaterThan(DOCK_PLANKS.minX + 0.1);
      expect(s.x).toBeLessThan(DOCK_PLANKS.maxX - 0.1);
      expect(s.z).toBeLessThan(DOCK_PLANKS.maxZ - 0.1);
      expect(Math.hypot(s.x - DOCK_STAND_X, s.z - DOCK_STAND_Z)).toBeGreaterThan(0.6);
      expect(Math.hypot(s.x - THERMOS_SPOT.x, s.z - THERMOS_SPOT.z)).toBeGreaterThan(0.12);
      expect(Math.hypot(s.x - CUP_SPOT.x, s.z - CUP_SPOT.z)).toBeGreaterThan(0.08);
    }
  });

  it("moves at a snail's pace and leaves its trail behind it", () => {
    const a = snailAt(100);
    const b = snailAt(110);
    const moved = Math.hypot(b.x - a.x, b.z - a.z);
    expect(moved).toBeGreaterThan(0.03);
    expect(moved).toBeLessThan(0.1);
    const trail = trailAt(100, 8);
    expect(Math.hypot(trail[0].x - a.x, trail[0].z - a.z)).toBeLessThan(0.05);
    expect(Math.hypot(trail[7].x - a.x, trail[7].z - a.z)).toBeGreaterThan(0.2);
    // A new snail has barely any trail.
    const fresh = trailAt(1, 8);
    expect(Math.hypot(fresh[7].x - fresh[0].x, fresh[7].z - fresh[0].z)).toBeLessThan(0.02);
  });

  it("holds still with reduced motion", () => {
    expect(snailAt(5, true)).toEqual(snailAt(500, true));
  });
});
