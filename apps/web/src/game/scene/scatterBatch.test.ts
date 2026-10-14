import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { batchPlaced, placement } from "./scatterBatch";

function tree(geometry: THREE.BufferGeometry, trunk: THREE.Material, crown: THREE.Material) {
  const root = new THREE.Group();
  const stem = new THREE.Mesh(geometry, trunk);
  const top = new THREE.Mesh(geometry, crown);
  top.position.set(0, 2, 0);
  root.add(stem, top);
  return root;
}

describe("batchPlaced", () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const bark = new THREE.MeshBasicMaterial();
  const leaf = new THREE.MeshBasicMaterial();

  it("draws each shared part once, with one instance per copy", () => {
    const placed = [0, 1, 2].map((i) => ({ root: tree(geometry, bark, leaf), matrix: placement([i * 5, 0, 0], 0, 1) }));
    const batches = batchPlaced(placed);
    expect(batches).toHaveLength(2);
    expect(batches.map((b) => b.count)).toEqual([3, 3]);
  });

  it("puts each part where the copy stood: placement, turn and scale, then the part's own offset", () => {
    const [, crowns] = batchPlaced([{ root: tree(geometry, bark, leaf), matrix: placement([4, 1, -3], Math.PI / 2, 2) }]);
    const at = new THREE.Matrix4();
    crowns!.getMatrixAt(0, at);
    const where = new THREE.Vector3().setFromMatrixPosition(at);
    expect(where.x).toBeCloseTo(4);
    expect(where.y).toBeCloseTo(1 + 2 * 2);
    expect(where.z).toBeCloseTo(-3);
  });

  it("keeps the root's own lift (a model sat on the ground) and skips hidden parts", () => {
    const root = tree(geometry, bark, leaf);
    root.position.y = 0.5;
    root.children[1]!.visible = false;
    const batches = batchPlaced([{ root, matrix: placement([0, 0, 0], 0, 1) }]);
    expect(batches).toHaveLength(1);
    const at = new THREE.Matrix4();
    batches[0]!.getMatrixAt(0, at);
    expect(new THREE.Vector3().setFromMatrixPosition(at).y).toBeCloseTo(0.5);
  });

  it("keeps copies with different materials apart", () => {
    const autumn = new THREE.MeshBasicMaterial();
    const batches = batchPlaced([
      { root: tree(geometry, bark, leaf), matrix: placement([0, 0, 0], 0, 1) },
      { root: tree(geometry, bark, autumn), matrix: placement([3, 0, 0], 0, 1) },
    ]);
    expect(batches.map((b) => b.count).sort()).toEqual([1, 1, 2]);
  });
});
