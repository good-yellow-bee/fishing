import { describe, expect, it } from "vitest";
import { weedTangleShape, weedThrash } from "./weedTangle";

describe("the weeds a fish has buried itself in", () => {
  it("is a ring of green stems standing up out of the water", () => {
    const shape = weedTangleShape();
    shape.computeBoundingBox();
    const box = shape.boundingBox!;
    expect(box.min.y).toBeLessThan(0);
    expect(box.max.y).toBeGreaterThan(0.35);
    expect(box.max.x).toBeGreaterThan(0.1);
    expect(box.min.x).toBeLessThan(-0.1);
    const color = shape.getAttribute("color");
    expect(color.getY(0)).toBeGreaterThan(color.getX(0));
    shape.dispose();
  });

  it("whips about, never far over", () => {
    const poses = Array.from({ length: 200 }, (_, i) => weedThrash(i * 0.05));
    for (const pose of poses) {
      expect(Math.abs(pose.x)).toBeLessThan(0.3);
      expect(Math.abs(pose.z)).toBeLessThan(0.3);
    }
    expect(Math.max(...poses.map((p) => p.z)) - Math.min(...poses.map((p) => p.z))).toBeGreaterThan(0.3);
  });

  it("holds still under reduced motion", () => {
    expect(weedThrash(1.7, true)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
