import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { mergeParts } from "./mergeParts";

describe("mergeParts", () => {
  it("bakes each part's place into one shape", () => {
    const shape = mergeParts([
      { geometry: new THREE.SphereGeometry(1, 6, 4), position: [2, 0, 0] },
      { geometry: new THREE.ConeGeometry(1, 2, 5), position: [-2, 0, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 0.5] },
    ]);
    shape.computeBoundingBox();
    expect(shape.boundingBox!.max.x).toBeCloseTo(3, 5);
    expect(shape.boundingBox!.min.x).toBeLessThan(-2.8);
    expect(shape.index).toBeNull();
    expect(shape.getAttribute("normal")).toBeDefined();
  });
});
