import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { staticPlacement } from "./StaticModels";

describe("staticPlacement", () => {
  it("places a model as a ToonModel group would: turned on all three axes, sized, then moved", () => {
    const item = { url: "x.glb", position: [1, 2, 3] as const, rotation: [0.15, 0.6, 1.15] as const, scale: 1.25 };
    const group = new THREE.Group();
    group.position.set(...item.position);
    group.rotation.set(...item.rotation);
    group.scale.setScalar(item.scale);
    group.updateMatrix();
    expect(staticPlacement(item).toArray().map((v) => +v.toFixed(6))).toEqual(group.matrix.toArray().map((v) => +v.toFixed(6)));
  });

  it("stands a model with no turn or size given as it is, where it is put", () => {
    const at = staticPlacement({ url: "x.glb", position: [4, 0, -2] });
    expect(new THREE.Vector3().setFromMatrixPosition(at).toArray()).toEqual([4, 0, -2]);
    expect(new THREE.Vector3().setFromMatrixScale(at).toArray()).toEqual([1, 1, 1]);
  });
});
