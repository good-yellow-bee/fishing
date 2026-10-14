import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { DEW_BURN_SEC, DEW_GLINT_COUNT, DEW_LEFT, dewGlint, dewGlintSpot, dewGlintsOut, dewLeft } from "./dewGlints";

describe("dew glints", () => {
  it("show at dawn outside winter", () => {
    expect(dewGlintsOut("dawn", "spring")).toBe(true);
    expect(dewGlintsOut("dawn", "winter")).toBe(false);
    expect(dewGlintsOut("day", "summer")).toBe(false);
  });

  it("sit in the grass just past the water", () => {
    for (let i = 0; i < DEW_GLINT_COUNT; i += 1) {
      const spot = dewGlintSpot(i);
      const reach = Math.hypot(spot.x / LAKE_RX, (spot.z - LAKE_CENTER_Z) / LAKE_RZ);
      expect(reach).toBeGreaterThan(1);
      expect(reach).toBeLessThan(1.2);
      expect(spot.y).toBeGreaterThan(0);
    }
  });

  it("glint briefly, with most drops dark at any moment", () => {
    let bright = 0;
    for (let i = 0; i < DEW_GLINT_COUNT; i += 1) {
      const g = dewGlint(i, 12.3);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      if (g > 0.5) bright += 1;
    }
    expect(bright).toBeGreaterThan(0);
    expect(bright).toBeLessThan(DEW_GLINT_COUNT / 3);
  });

  it("burns off as the morning goes", () => {
    expect(dewLeft(0)).toBe(1);
    expect(dewLeft(DEW_BURN_SEC / 2)).toBeLessThan(1);
    expect(dewLeft(DEW_BURN_SEC * 3)).toBeCloseTo(DEW_LEFT, 6);
  });
});
