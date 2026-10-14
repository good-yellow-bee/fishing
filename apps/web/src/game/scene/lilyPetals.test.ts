import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { petalAngles } from "./lilyBloom";
import { lilyPetalsGeometry, sharedLilyPetals } from "./lilyPetals";

describe("lily petals", () => {
  it("rings every petal round the heart in one shape", () => {
    const shape = lilyPetalsGeometry();
    const one = new THREE.SphereGeometry(1, 8, 5).toNonIndexed().getAttribute("position").count;
    expect(shape.getAttribute("position").count).toBe(one * petalAngles().length);
    shape.computeBoundingBox();
    const box = shape.boundingBox!;
    expect(box.max.x).toBeCloseTo(-box.min.x, 2);
    expect(box.max.z).toBeGreaterThan(0.12);
    expect(box.min.y).toBeGreaterThan(-0.05);
  });

  it("shares one shape across flowers", () => {
    expect(sharedLilyPetals()).toBe(sharedLilyPetals());
  });
});
