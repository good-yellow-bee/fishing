import { DOCK_PLANKS } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  PLANK_LEAF_COUNT,
  PLANK_LEAVES_AT_START,
  SKITTER_ROUND_SEC,
  SKITTER_SEC,
  dockLeavesOut,
  plankLeafArrives,
  plankLeafAt,
} from "./plankLeaves";

const CALM = { x: 0, z: 0 };

function shown(time: number) {
  let n = 0;
  for (let i = 0; i < PLANK_LEAF_COUNT; i += 1) if (plankLeafAt(i, time, CALM)) n += 1;
  return n;
}

describe("plank leaves", () => {
  it("only lie on the dock in fall", () => {
    expect(dockLeavesOut("fall")).toBe(true);
    expect(dockLeavesOut("summer")).toBe(false);
    expect(dockLeavesOut("winter")).toBe(false);
  });

  it("start with a few and gather more over the visit", () => {
    expect(shown(0)).toBe(PLANK_LEAVES_AT_START);
    expect(shown(120)).toBeGreaterThan(PLANK_LEAVES_AT_START);
    expect(shown(3600)).toBe(PLANK_LEAF_COUNT);
    expect(plankLeafArrives(PLANK_LEAF_COUNT - 1)).toBeGreaterThan(plankLeafArrives(PLANK_LEAVES_AT_START));
  });

  it("stay on the planks however long the wind blows", () => {
    const wind = { x: 0.2, z: -0.1 };
    for (let i = 0; i < PLANK_LEAF_COUNT; i += 1) {
      const leaf = plankLeafAt(i, 5000, wind)!;
      expect(leaf.x).toBeGreaterThanOrEqual(DOCK_PLANKS.minX);
      expect(leaf.x).toBeLessThanOrEqual(DOCK_PLANKS.maxX);
      expect(leaf.z).toBeGreaterThanOrEqual(DOCK_PLANKS.minZ);
      expect(leaf.z).toBeLessThanOrEqual(DOCK_PLANKS.maxZ);
    }
  });

  it("skitter smoothly once a round and land flat", () => {
    const index = 2;
    const start = (index + PLANK_LEAF_COUNT) * SKITTER_ROUND_SEC;
    const before = plankLeafAt(index, start - 0.01, CALM)!;
    const mid = plankLeafAt(index, start + SKITTER_SEC / 2, CALM)!;
    const after = plankLeafAt(index, start + SKITTER_SEC + 0.5, CALM)!;
    const later = plankLeafAt(index, start + SKITTER_ROUND_SEC - 0.1, CALM)!;
    expect(before.lift).toBe(0);
    expect(mid.lift).toBeGreaterThan(0);
    expect(after.lift).toBe(0);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.01);
    expect(later.x).toBeCloseTo(after.x, 6);
    const nudge = plankLeafAt(index, start + 0.02, CALM)!;
    expect(Math.hypot(nudge.x - before.x, nudge.z - before.z)).toBeLessThan(0.01);
  });

  it("drift downwind when it blows", () => {
    const wind = { x: 0.1, z: 0 };
    let moved = 0;
    for (let i = 0; i < PLANK_LEAVES_AT_START; i += 1) moved += plankLeafAt(i, 400, wind)!.x - plankLeafAt(i, 0, wind)!.x;
    expect(moved).toBeGreaterThan(0);
  });
});
