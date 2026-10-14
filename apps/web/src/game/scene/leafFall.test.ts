import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { LEAF_COUNT, LEAF_CYCLE_SEC, LEAF_FALL_SEC, LEAF_FLOAT_SEC, LEAF_TOP, leafAt, leavesOut } from "./leafFall";

const CALM = { x: 0, z: 0 };

/** Finds a time when leaf `index` is `into` seconds into its cycle. */
function startOf(index: number) {
  for (let t = 0; t < LEAF_CYCLE_SEC; t += 0.05) {
    const before = leafAt(index, t - 0.05, CALM);
    const now = leafAt(index, t, CALM);
    if (before === null && now !== null) return t;
  }
  throw new Error("no start");
}

describe("falling leaves", () => {
  it("only fall in autumn", () => {
    expect(leavesOut("fall")).toBe(true);
    expect(leavesOut("summer")).toBe(false);
    expect(leavesOut("winter")).toBe(false);
  });

  it("let go from the canopy, land on the water and sink out of sight", () => {
    const t = startOf(3);
    expect(leafAt(3, t, CALM)!.height).toBeCloseTo(LEAF_TOP, 0);
    const landed = leafAt(3, t + LEAF_FALL_SEC + 1, CALM)!;
    expect(landed.height).toBe(0);
    expect(landed.tilt).toBe(0);
    expect(inLake(landed.x, landed.z)).toBe(true);
    expect(leafAt(3, t + LEAF_FALL_SEC + LEAF_FLOAT_SEC + 0.75, CALM)!.size).toBeLessThan(1);
    expect(leafAt(3, t + LEAF_FALL_SEC + LEAF_FLOAT_SEC + 2, CALM)).toBeNull();
  });

  it("drift downwind once they are on the water", () => {
    const t = startOf(7) + LEAF_FALL_SEC;
    const wind = { x: 0.1, z: 0 };
    const early = leafAt(7, t + 1, wind)!;
    const late = leafAt(7, t + 9, wind)!;
    expect(late.x - early.x).toBeGreaterThan(0.5);
    expect(late.z).toBeCloseTo(early.z);
  });

  it("keeps a good share of the leaves down at any moment", () => {
    const down = Array.from({ length: LEAF_COUNT }, (_, i) => leafAt(i, 100, CALM)).filter(Boolean).length;
    expect(down).toBeGreaterThan(LEAF_COUNT / 3);
  });
});
