import { describe, expect, it } from "vitest";
import { fillKind, fillLayout, leafSpots } from "./boatBilge";

const HULL = { min: { x: -0.5, y: -0.1, z: -1.6 }, max: { x: 0.5, y: 0.5, z: 1.6 } };

describe("boat fill", () => {
  it("fills moored boats with snow in winter, rainwater in the rain, and leaves in the fall", () => {
    expect(fillKind("winter", "clear")).toBe("snow");
    expect(fillKind("winter", "rain")).toBe("snow");
    expect(fillKind("summer", "rain")).toBe("water");
    expect(fillKind("fall", "rain")).toBe("water");
    expect(fillKind("fall", "clear")).toBe("leaves");
    expect(fillKind("summer", "clear")).toBeNull();
    expect(fillKind("spring", "fog")).toBeNull();
  });

  it("lays each fill inside the hull, snow deepest", () => {
    const snow = fillLayout("snow", HULL);
    const water = fillLayout("water", HULL);
    expect(snow.y).toBeGreaterThan(water.y);
    for (const fill of [snow, water, fillLayout("leaves", HULL)]) {
      expect(fill.y).toBeGreaterThan(HULL.min.y);
      expect(fill.y).toBeLessThan(HULL.max.y);
      expect(fill.across).toBeLessThan(0.5);
      expect(fill.along).toBeLessThan(1.6);
    }
  });

  it("scatters the leaves inside the fill, the same way each time", () => {
    const leaves = leafSpots(7, 2);
    expect(leaves).toEqual(leafSpots(7, 2));
    for (const leaf of leaves) expect(Math.hypot(leaf.x, leaf.z)).toBeLessThanOrEqual(0.85);
    expect(new Set(leaves.map((leaf) => leaf.colour)).size).toBe(3);
  });

  it("narrows the fill for a model whose box is wider than its hull", () => {
    expect(fillLayout("snow", HULL, 0.2).across).toBeCloseTo(0.2, 6);
    expect(fillLayout("snow", HULL, 0.2).along).toBe(fillLayout("snow", HULL).along);
  });
});
