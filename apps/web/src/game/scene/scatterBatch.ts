import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** One placed copy of a model: its prepared (toon, tinted, shared-material) clone and where it stands. */
export type Placed = { root: THREE.Object3D; matrix: THREE.Matrix4 };

function materialKey(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material) ? material.map((m) => m.uuid).join(",") : material.uuid;
}

/** The attribute each merged vertex carries: the foot of the copy it belongs to, for the tree sway (treeSway.ts). */
export const SWAY_FOOT = "swayFoot";

/**
 * Bakes every copy of every part that shares a material (and shadow settings, and vertex layout) into
 * one merged mesh, so a ring of trees of several kinds costs one draw per material instead of one per
 * part. Each copy's vertices are moved by its placement times the part's place inside its model, and
 * carry that copy's foot in SWAY_FOOT. Parts with several materials keep one instanced mesh per part.
 */
export function batchPlaced(placed: readonly Placed[]): THREE.Mesh[] {
  const merged = new Map<string, { material: THREE.Material; castShadow: boolean; receiveShadow: boolean; name: string; pieces: THREE.BufferGeometry[] }>();
  const instanced = new Map<string, { mesh: THREE.Mesh; matrices: THREE.Matrix4[] }>();
  const foot = new THREE.Vector3();
  for (const { root, matrix } of placed) {
    // The root stands alone (a fresh clone), so a part's world matrix is its place in the model, the root's own lift included.
    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
      const at = matrix.clone().multiply(obj.matrixWorld);
      const shadows = `${obj.castShadow ? 1 : 0}${obj.receiveShadow ? 1 : 0}`;
      if (Array.isArray(obj.material)) {
        const key = `${obj.geometry.uuid}|${materialKey(obj.material)}|${shadows}`;
        const group = instanced.get(key);
        if (group) group.matrices.push(at);
        else instanced.set(key, { mesh: obj, matrices: [at] });
        return;
      }
      const piece = (obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone()).applyMatrix4(at);
      foot.setFromMatrixPosition(at);
      const count = piece.getAttribute("position").count;
      piece.setAttribute(SWAY_FOOT, new THREE.Float32BufferAttribute(new Float32Array(count * 3).map((_, i) => foot.getComponent(i % 3)), 3));
      const layout = Object.keys(piece.attributes).sort().join(",");
      const key = `${obj.material.uuid}|${shadows}|${layout}`;
      const group = merged.get(key);
      if (group) group.pieces.push(piece);
      else merged.set(key, { material: obj.material, castShadow: obj.castShadow, receiveShadow: obj.receiveShadow, name: obj.name, pieces: [piece] });
    });
  }
  const meshes: THREE.Mesh[] = [];
  for (const { material, castShadow, receiveShadow, name, pieces } of merged.values()) {
    const geometry = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    meshes.push(mesh);
  }
  for (const { mesh, matrices } of instanced.values()) {
    const batch = new THREE.InstancedMesh(mesh.geometry, mesh.material, matrices.length);
    batch.name = mesh.name;
    matrices.forEach((at, i) => batch.setMatrixAt(i, at));
    batch.instanceMatrix.needsUpdate = true;
    batch.castShadow = mesh.castShadow;
    batch.receiveShadow = mesh.receiveShadow;
    batch.computeBoundingSphere();
    meshes.push(batch);
  }
  return meshes;
}

/** A copy's placement from position, a turn about Y, and scale. */
export function placement(position: readonly [number, number, number], rotY: number, scale: number) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY),
    new THREE.Vector3(scale, scale, scale),
  );
}
