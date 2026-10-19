import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { bakeStatic, staticPlacement } from "./StaticModels";

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

  it("bakes a list with one prepared copy per look, keeping a sat-on-ground model's lift", () => {
    const model = new THREE.Group();
    const block = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#7a5a3a" }));
    block.position.y = -2;
    model.add(block);
    const scenes = new Map([["block.glb", model]]);
    const { meshes } = bakeStatic(
      [
        { url: "block.glb", position: [0, 0, 0], sitOnGround: true },
        { url: "block.glb", position: [5, 0, 0], sitOnGround: true },
      ],
      scenes,
    );
    expect(meshes).toHaveLength(1);
    meshes[0]!.geometry.computeBoundingBox();
    const box = meshes[0]!.geometry.boundingBox!;
    // Sat on the ground: its bottom at y 0, though the part hangs 2 below its model's origin.
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.x).toBeCloseTo(5.5);
  });
});
