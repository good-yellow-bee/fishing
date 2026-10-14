import { describe, expect, it } from "vitest";
import { ROD_BOW_MAX, ROD_MESH_SCALE, rodBowAmount, rodBowOffset, rodTipAt } from "./rodBow";

describe("rod bow", () => {
  it("loads up with tension and surges, never past the most", () => {
    expect(rodBowAmount(0, 0)).toBe(0);
    expect(rodBowAmount(0.6, 0)).toBeGreaterThan(rodBowAmount(0.3, 0));
    expect(rodBowAmount(0.6, 2)).toBeGreaterThan(rodBowAmount(0.6, 0));
    expect(rodBowAmount(1, 2)).toBeLessThanOrEqual(ROD_BOW_MAX);
  });

  it("keeps the butt straight and bends most at the tip", () => {
    expect(rodBowOffset(-0.01, 0.05, 0.3)).toBe(0);
    expect(rodBowOffset(0.025, 0.05, 0.3)).toBeCloseTo(0.3 / 4 / ROD_MESH_SCALE);
    expect(rodBowOffset(0.05, 0.05, 0.3)).toBeCloseTo(0.3 / ROD_MESH_SCALE);
  });

  it("moves the line's tip with the bow", () => {
    expect(rodTipAt(0, 0.94)).toEqual({ y: 0.94, z: 0 });
    const bowed = rodTipAt(0.3, 0.94);
    expect(bowed.z).toBeCloseTo(0.3);
    expect(bowed.y).toBeLessThan(0.94);
  });
});
