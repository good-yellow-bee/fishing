import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { BAKED_LAYER, skinFigure } from "./skinFigure";

function figure() {
  const material = new THREE.MeshToonMaterial({ vertexColors: true });
  const root = new THREE.Group();
  root.position.set(3, 0, -2);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.2), material);
  torso.castShadow = true;
  const arm = new THREE.Group();
  arm.position.set(0.2, 0.5, 0);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), material);
  hand.position.y = -0.2;
  arm.add(hand);
  const other = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial());
  root.add(torso, arm, other);
  return { root, material, torso, arm, hand, other };
}

/** Where vertex `v` of the skinned mesh lands in the world, as the GPU would put it. */
function skinnedAt(mesh: THREE.SkinnedMesh, v: number) {
  mesh.updateMatrixWorld(true);
  mesh.skeleton.update();
  const point = new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute("position"), v);
  return mesh.applyBoneTransform(v, point).applyMatrix4(mesh.matrixWorld);
}

describe("skinned figure", () => {
  it("bakes the parts that share the material into one skinned mesh and hides them from the camera", () => {
    const { root, material, torso, hand, other } = figure();
    const baked = skinFigure(root, material)!;
    expect(baked.mesh.skeleton.bones).toHaveLength(2);
    expect(baked.mesh.castShadow).toBe(true);
    expect(torso.layers.isEnabled(BAKED_LAYER) && !torso.layers.isEnabled(0)).toBe(true);
    expect(hand.layers.isEnabled(0)).toBe(false);
    expect(other.layers.isEnabled(0)).toBe(true);
    baked.dispose();
    expect(torso.layers.isEnabled(0)).toBe(true);
    expect(root.children).not.toContain(baked.mesh);
  });

  it("keeps each part on its group as the figure moves and swings", () => {
    const { root, material, hand, arm } = figure();
    const baked = skinFigure(root, material)!;
    const handVertex = baked.mesh.geometry.getAttribute("position").count - 1;
    const handPositions = hand.geometry.toNonIndexed().getAttribute("position");
    const local = new THREE.Vector3().fromBufferAttribute(handPositions, handPositions.count - 1);
    root.position.set(-5, 1, 4);
    root.rotation.y = 0.8;
    arm.rotation.x = 1.1;
    root.updateMatrixWorld(true);
    expect(skinnedAt(baked.mesh, handVertex).distanceTo(local.clone().applyMatrix4(hand.matrixWorld))).toBeLessThan(1e-5);
    baked.dispose();
  });

  it("folds a part away while its group is hidden", () => {
    const { root, material, arm } = figure();
    const baked = skinFigure(root, material)!;
    const handVertex = baked.mesh.geometry.getAttribute("position").count - 1;
    arm.visible = false;
    baked.update();
    root.updateMatrixWorld(true);
    const armRoot = new THREE.Vector3().setFromMatrixPosition(arm.matrixWorld);
    // The hand shrinks onto its own origin, half its length below the shoulder.
    expect(skinnedAt(baked.mesh, handVertex).distanceTo(armRoot)).toBeCloseTo(0.2, 5);
    arm.visible = true;
    baked.update();
    expect(baked.mesh.skeleton.bones[1]!.scale.x).toBe(1);
    baked.dispose();
  });

  it("folds away a part taken out of the figure", () => {
    const { root, material, arm, hand } = figure();
    const baked = skinFigure(root, material)!;
    const handVertex = baked.mesh.geometry.getAttribute("position").count - 1;
    arm.remove(hand);
    baked.update();
    root.updateMatrixWorld(true);
    expect(skinnedAt(baked.mesh, handVertex).length()).toBe(0);
    baked.dispose();
  });

  it("leaves a lone part alone", () => {
    const material = new THREE.MeshToonMaterial();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    expect(skinFigure(root, material)).toBeNull();
  });
});
