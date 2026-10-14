import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Part = {
  geometry: THREE.BufferGeometry;
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number | readonly [number, number, number];
};

/**
 * Several meshes that share a material and never move apart, baked into one shape so they cost one draw.
 * Each part's geometry is consumed (disposed) here.
 */
export function mergeParts(parts: readonly Part[]): THREE.BufferGeometry {
  const placed = parts.map(({ geometry, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
    const size = typeof scale === "number" ? new THREE.Vector3().setScalar(scale) : new THREE.Vector3(...scale);
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), size);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    return flat.applyMatrix4(matrix);
  });
  const shape = mergeGeometries(placed);
  placed.forEach((part) => part.dispose());
  if (!shape) throw new Error("parts do not share attributes");
  return shape;
}
