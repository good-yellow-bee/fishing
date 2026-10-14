import { describe, expect, it } from "vitest";
import { cormorantShapes } from "./Cormorant";

describe("cormorantShapes", () => {
  it("bakes the bird into a body and two mirrored wings", () => {
    const { body, left, right } = cormorantShapes();
    for (const shape of [body, left, right]) expect(shape.getAttribute("color").count).toBe(shape.getAttribute("position").count);
    left.computeBoundingBox();
    right.computeBoundingBox();
    expect(left.boundingBox!.max.x).toBeCloseTo(-right.boundingBox!.min.x, 6);
    expect(left.boundingBox!.min.x).toBeGreaterThan(-0.05);
  });
});
