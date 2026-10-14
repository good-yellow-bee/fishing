import { DOCK_PLANKS } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { DOCK_ICICLES, RAIL_UNDERSIDE_Y, iciclesOut } from "./icicleRow";

describe("icicles", () => {
  it("hang only in winter", () => {
    expect(iciclesOut("winter")).toBe(true);
    expect(iciclesOut("fall")).toBe(false);
  });

  it("hang along both side walls, clear of the deck", () => {
    expect(DOCK_ICICLES.length).toBeGreaterThan(20);
    expect(DOCK_ICICLES.some((i) => i.x < 0)).toBe(true);
    expect(DOCK_ICICLES.some((i) => i.x > 0)).toBe(true);
    for (const icicle of DOCK_ICICLES) {
      expect(Math.abs(icicle.x)).toBeGreaterThan(DOCK_PLANKS.maxX - 0.1);
      expect(icicle.z).toBeGreaterThan(DOCK_PLANKS.minZ - 0.1);
      expect(icicle.z).toBeLessThan(DOCK_PLANKS.maxZ + 0.1);
      expect(icicle.y).toBeCloseTo(RAIL_UNDERSIDE_Y, 6);
      expect(icicle.y - icicle.length).toBeGreaterThan(DOCK_PLANKS.top);
    }
  });

  it("vary in length", () => {
    const lengths = DOCK_ICICLES.map((i) => i.length);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(0.08);
  });
});
