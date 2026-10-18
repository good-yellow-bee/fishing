import { describe, expect, it } from "vitest";
import { hullShape, mainsailShape, sailorShape } from "./Dinghy";

describe("dinghy shapes", () => {
  it("bake the hull with its jib, the mainsail on its boom, and the sailor", () => {
    for (const shape of [hullShape(), mainsailShape(), sailorShape()]) {
      expect(shape.getAttribute("position").count).toBeGreaterThan(0);
      expect(shape.getAttribute("color").count).toBe(shape.getAttribute("position").count);
      shape.dispose();
    }
  });

  it("stands the mast and sail well above the water", () => {
    const hull = hullShape();
    hull.computeBoundingBox();
    expect(hull.boundingBox!.max.y).toBeGreaterThan(2);
    expect(hull.boundingBox!.min.y).toBeLessThan(0);
    hull.dispose();
  });
});
