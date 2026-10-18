import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { SUNK_COLORS, SUNK_COUNT, sunkenLeaves, sunkenLeavesOut } from "./leafLitter";
import { waterDepth } from "./water";

describe("leaves sunk on the bed", () => {
  it("lie there from fall through winter, rotted away by spring", () => {
    expect(sunkenLeavesOut("fall")).toBe(true);
    expect(sunkenLeavesOut("winter")).toBe(true);
    expect(sunkenLeavesOut("spring")).toBe(false);
    expect(sunkenLeavesOut("summer")).toBe(false);
  });

  it("settle on the clear shallow bed round the dock, every one under water", () => {
    const leaves = sunkenLeaves();
    expect(leaves).toHaveLength(SUNK_COUNT);
    for (const leaf of leaves) {
      expect(inLake(leaf.x, leaf.z)).toBe(true);
      expect(waterDepth(leaf.x, leaf.z)).toBeGreaterThan(0.02);
      expect(waterDepth(leaf.x, leaf.z)).toBeLessThanOrEqual(0.42);
      expect(leaf.color).toBeLessThan(SUNK_COLORS.length);
    }
    // Spread round both sides of the dock, not in one heap.
    expect(leaves.some((l) => l.x < -1.5)).toBe(true);
    expect(leaves.some((l) => l.x > 1.5)).toBe(true);
  });
});
