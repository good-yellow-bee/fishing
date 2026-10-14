import * as THREE from "three";

/** One placed copy of a model: its prepared (toon, tinted, shared-material) clone and where it stands. */
export type Placed = { root: THREE.Object3D; matrix: THREE.Matrix4 };

function materialKey(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material) ? material.map((m) => m.uuid).join(",") : material.uuid;
}

/**
 * Packs every copy of every part that shares a geometry and material into one
 * instanced mesh, so a ring of trees costs one draw per part instead of one
 * per tree. Each instance's matrix is the copy's placement times the part's
 * place inside its model.
 */
export function batchPlaced(placed: readonly Placed[]): THREE.InstancedMesh[] {
  const groups = new Map<string, { mesh: THREE.Mesh; matrices: THREE.Matrix4[] }>();
  for (const { root, matrix } of placed) {
    // The root stands alone (a fresh clone), so a part's world matrix is its place in the model, the root's own lift included.
    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
      const key = `${obj.geometry.uuid}|${materialKey(obj.material)}|${obj.castShadow ? 1 : 0}${obj.receiveShadow ? 1 : 0}`;
      const at = matrix.clone().multiply(obj.matrixWorld);
      const group = groups.get(key);
      if (group) group.matrices.push(at);
      else groups.set(key, { mesh: obj, matrices: [at] });
    });
  }
  const batches: THREE.InstancedMesh[] = [];
  for (const { mesh, matrices } of groups.values()) {
    const batch = new THREE.InstancedMesh(mesh.geometry, mesh.material, matrices.length);
    batch.name = mesh.name;
    matrices.forEach((at, i) => batch.setMatrixAt(i, at));
    batch.instanceMatrix.needsUpdate = true;
    batch.castShadow = mesh.castShadow;
    batch.receiveShadow = mesh.receiveShadow;
    batch.computeBoundingSphere();
    batches.push(batch);
  }
  return batches;
}

/** A copy's placement from position, a turn about Y, and scale. */
export function placement(position: readonly [number, number, number], rotY: number, scale: number) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY),
    new THREE.Vector3(scale, scale, scale),
  );
}
