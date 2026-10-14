import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { rockMatrix } from "./LakeWorld";

describe("rockMatrix", () => {
  it("places an instanced rock exactly where a lone rock mesh stood", () => {
    const lone = new THREE.Object3D();
    lone.position.set(16.2, 0.5, 3.5);
    lone.rotation.set(0.15, 1.1, -0.08);
    lone.scale.set(1.4, 0.85, 1.1);
    lone.updateMatrix();
    const placed = rockMatrix({ position: [16.2, 0.5, 3.5], scale: [1.4, 0.85, 1.1], rotation: 1.1 });
    placed.elements.forEach((value, i) => expect(value).toBeCloseTo(lone.matrix.elements[i]!, 9));
  });
});
