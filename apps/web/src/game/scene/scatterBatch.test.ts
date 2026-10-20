import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { SWAY_FOOT, batchPlaced, placedPiece, placement } from "./scatterBatch";

function tree(trunkShape: THREE.BufferGeometry, crownShape: THREE.BufferGeometry, trunk: THREE.Material, crown: THREE.Material) {
  const root = new THREE.Group();
  const stem = new THREE.Mesh(trunkShape, trunk);
  const top = new THREE.Mesh(crownShape, crown);
  top.position.set(0, 2, 0);
  root.add(stem, top);
  return root;
}

const vertices = (mesh: THREE.Mesh) => mesh.geometry.getAttribute("position").count;

describe("batchPlaced", () => {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cone = new THREE.ConeGeometry(1, 2, 6);
  const bark = new THREE.MeshBasicMaterial();
  const leaf = new THREE.MeshBasicMaterial();
  const boxVerts = box.getAttribute("position").count;
  const coneVerts = cone.getAttribute("position").count;

  it("draws each material once, every copy and every kind of part baked into it", () => {
    const placed = [0, 1, 2].map((i) => ({ root: tree(box, i === 2 ? box : cone, bark, leaf), matrix: placement([i * 5, 0, 0], 0, 1) }));
    const meshes = batchPlaced(placed);
    expect(meshes).toHaveLength(2);
    expect(meshes.every((mesh) => !(mesh instanceof THREE.InstancedMesh))).toBe(true);
    const crowns = meshes.find((mesh) => mesh.material === leaf)!;
    expect(vertices(crowns)).toBe(coneVerts * 2 + boxVerts);
    expect(vertices(meshes.find((mesh) => mesh.material === bark)!)).toBe(boxVerts * 3);
  });

  it("puts each part where the copy stood (placement, turn and scale, then the part's own offset) and marks its tree's foot", () => {
    const meshes = batchPlaced([{ root: tree(box, box, bark, leaf), matrix: placement([4, 1, -3], Math.PI / 2, 2) }], true);
    const crowns = meshes.find((mesh) => mesh.material === leaf)!;
    crowns.geometry.computeBoundingBox();
    const middle = crowns.geometry.boundingBox!.getCenter(new THREE.Vector3());
    expect(middle.x).toBeCloseTo(4);
    expect(middle.y).toBeCloseTo(1 + 2 * 2);
    expect(middle.z).toBeCloseTo(-3);
    // Its foot is where the part stands: the sway grows with height above it, as the instanced trees' did.
    const feet = crowns.geometry.getAttribute(SWAY_FOOT);
    expect(feet.count).toBe(vertices(crowns));
    expect([feet.getX(0), feet.getY(0), feet.getZ(0)].map((v) => +v.toFixed(5))).toEqual([4, 5, -3]);
  });

  it("keeps the root's own lift (a model sat on the ground) and skips hidden parts", () => {
    const root = tree(box, box, bark, leaf);
    root.position.y = 0.5;
    root.children[1]!.visible = false;
    const meshes = batchPlaced([{ root, matrix: placement([0, 0, 0], 0, 1) }]);
    expect(meshes).toHaveLength(1);
    meshes[0]!.geometry.computeBoundingBox();
    expect(meshes[0]!.geometry.boundingBox!.getCenter(new THREE.Vector3()).y).toBeCloseTo(0.5);
  });

  it("keeps copies with different materials or shadows apart, and parts with several materials instanced", () => {
    const autumn = new THREE.MeshBasicMaterial();
    const shaded = tree(box, box, bark, leaf);
    shaded.children.forEach((part) => (part.castShadow = true));
    const twoTone = new THREE.Group();
    twoTone.add(new THREE.Mesh(box, [bark, leaf]));
    const meshes = batchPlaced([
      { root: tree(box, box, bark, leaf), matrix: placement([0, 0, 0], 0, 1) },
      { root: tree(box, box, bark, autumn), matrix: placement([3, 0, 0], 0, 1) },
      { root: shaded, matrix: placement([6, 0, 0], 0, 1) },
      { root: twoTone, matrix: placement([9, 0, 0], 0, 1) },
    ]);
    const merged = meshes.filter((mesh) => !(mesh instanceof THREE.InstancedMesh));
    expect(merged).toHaveLength(5);
    expect(meshes.filter((mesh) => mesh instanceof THREE.InstancedMesh)).toHaveLength(1);
  });

  it("marks feet only on batches that sway", () => {
    const meshes = batchPlaced([{ root: tree(box, box, bark, leaf), matrix: placement([0, 0, 0], 0, 1) }]);
    expect(meshes.every((mesh) => !mesh.geometry.getAttribute(SWAY_FOOT))).toBe(true);
  });

  it("keeps parts whose vertex data differs in shape apart instead of failing to merge", () => {
    const flat = box.toNonIndexed();
    const meshes = batchPlaced([
      { root: tree(box, box, bark, leaf), matrix: placement([0, 0, 0], 0, 1) },
      { root: tree(flat, flat, bark, leaf), matrix: placement([3, 0, 0], 0, 1) },
    ]);
    expect(meshes).toHaveLength(4);
  });

  it("turns a mirrored part's triangles back the right way round", () => {
    const triangle = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    const facing = (geometry: THREE.BufferGeometry) => {
      const p = geometry.getAttribute("position");
      const a = new THREE.Vector3().fromBufferAttribute(p, 0);
      const b = new THREE.Vector3().fromBufferAttribute(p, 1);
      const c = new THREE.Vector3().fromBufferAttribute(p, 2);
      return new THREE.Vector3().crossVectors(b.sub(a), c.sub(a)).z;
    };
    const mirror = new THREE.Matrix4().makeScale(-1, 1, 1);
    // Mirrored about x, the triangle would face away (-z); turned back, it faces +z as the renderer would have shown it.
    expect(facing(triangle.clone().applyMatrix4(mirror))).toBeLessThan(0);
    expect(facing(placedPiece(triangle, mirror))).toBeGreaterThan(0);
  });
});
