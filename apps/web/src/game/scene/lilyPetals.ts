import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { petalAngles } from "./lilyBloom";

/**
 * Every petal of an open lily as one shape, so a flower is two draws, not one per petal.
 * Outer petals lie open; every other one sits a touch higher and more upright.
 */
export function lilyPetalsGeometry() {
  const parts = petalAngles().map((angle, i) => {
    const petal = new THREE.SphereGeometry(1, 8, 5).toNonIndexed();
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(0, i % 2 ? 0.035 : 0.02, 0.07),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(i % 2 ? -0.75 : -0.35, 0, 0)),
      new THREE.Vector3(0.03, 0.012, 0.07),
    );
    return petal.applyMatrix4(new THREE.Matrix4().makeRotationY(angle).multiply(local));
  });
  const shape = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!shape) throw new Error("lily petals");
  return shape;
}

let shared: THREE.BufferGeometry | null = null;

/** One petal shape for every lily on the lake; it lives as long as the page. */
export function sharedLilyPetals() {
  shared ??= lilyPetalsGeometry();
  return shared;
}
