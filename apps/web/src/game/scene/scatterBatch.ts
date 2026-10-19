import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** One placed copy of a model: its prepared (toon, tinted, shared-material) clone and where it stands. */
export type Placed = { root: THREE.Object3D; matrix: THREE.Matrix4 };

function materialKey(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material) ? material.map((m) => m.uuid).join(",") : material.uuid;
}

/** The attribute each vertex of a swaying batch carries: the foot of the copy it belongs to, for the tree sway (treeSway.ts). */
export const SWAY_FOOT = "swayFoot";

/** What must match for geometries to merge: each attribute's name, size, array type and scaling, and whether it is indexed. */
function layoutOf(geometry: THREE.BufferGeometry) {
  const attributes = Object.entries(geometry.attributes)
    .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.array.constructor.name}:${attribute.normalized ? 1 : 0}`)
    .sort();
  return `${attributes.join(",")}|${geometry.index ? "indexed" : "flat"}`;
}

/** `geometry` moved by `at`, its triangles turned back the right way round if `at` mirrors it. */
export function placedPiece(geometry: THREE.BufferGeometry, at: THREE.Matrix4) {
  const piece = geometry.clone().applyMatrix4(at);
  if (at.determinant() >= 0) return piece;
  if (piece.index) {
    const index = piece.index;
    for (let i = 0; i + 2 < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
  } else {
    for (const attribute of Object.values(piece.attributes)) {
      for (let i = 0; i + 2 < attribute.count; i += 3) {
        for (let k = 0; k < attribute.itemSize; k += 1) {
          const b = attribute.getComponent(i + 1, k);
          attribute.setComponent(i + 1, k, attribute.getComponent(i + 2, k));
          attribute.setComponent(i + 2, k, b);
        }
      }
    }
  }
  return piece;
}

/**
 * Bakes every copy of every part that shares a material (and shadow settings, and vertex layout) into
 * one merged mesh, so a ring of trees of several kinds costs one draw per material instead of one per
 * part. Each copy's vertices are moved by its placement times the part's place inside its model; with
 * `sway`, each also carries that copy's foot in SWAY_FOOT. Parts with several materials keep one
 * instanced mesh per part, and never sway.
 */
export function batchPlaced(placed: readonly Placed[], sway = false): THREE.Mesh[] {
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
      const piece = placedPiece(obj.geometry, at);
      if (sway) {
        foot.setFromMatrixPosition(at);
        const feet = new Float32Array(piece.getAttribute("position").count * 3);
        for (let i = 0; i < feet.length; i += 3) feet.set([foot.x, foot.y, foot.z], i);
        piece.setAttribute(SWAY_FOOT, new THREE.BufferAttribute(feet, 3));
      }
      const key = `${obj.material.uuid}|${shadows}|${layoutOf(piece)}`;
      const group = merged.get(key);
      if (group) group.pieces.push(piece);
      else merged.set(key, { material: obj.material, castShadow: obj.castShadow, receiveShadow: obj.receiveShadow, name: obj.name, pieces: [piece] });
    });
  }
  const meshes: THREE.Mesh[] = [];
  for (const { material, castShadow, receiveShadow, name, pieces } of merged.values()) {
    const geometry = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    // The layout key matches everything mergeGeometries checks, so this would be a bug here, not bad data.
    if (!geometry) throw new Error(`Could not merge the scatter batch for ${name || material.uuid}.`);
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
