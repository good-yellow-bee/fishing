import { describe, expect, it } from "vitest";
import { weedClumpShape } from "./weedClump";

describe("the ball of weed on the line", () => {
  it("is a low green clump, wider than tall", () => {
    const shape = weedClumpShape();
    shape.computeBoundingBox();
    const box = shape.boundingBox!;
    expect(box.max.x - box.min.x).toBeGreaterThan((box.max.y - box.min.y) * 2);
    const color = shape.getAttribute("color");
    expect(color.getY(0)).toBeGreaterThan(color.getX(0));
    shape.dispose();
  });
});
