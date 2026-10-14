import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** The four long legs, as angles round from the head and their reach. */
export const STRIDER_LEGS: ReadonlyArray<readonly [number, number]> = [
  [0.75, 0.085],
  [-0.75, 0.085],
  [2.35, 0.1],
  [-2.35, 0.1],
];

function placed(geometry: THREE.BufferGeometry, position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3) {
  return geometry.applyMatrix4(new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(rotation), scale));
}

/** A strider's body and legs as one shape, head along +z, at life size. */
export function striderBodyGeometry() {
  const parts = [placed(new THREE.SphereGeometry(1, 8, 6), new THREE.Vector3(0, 0.006, 0), new THREE.Euler(), new THREE.Vector3(0.008, 0.006, 0.03))];
  for (const [angle, reach] of STRIDER_LEGS) {
    const leg = placed(new THREE.BoxGeometry(0.003, 0.003, 1), new THREE.Vector3(0, 0.004, reach / 2), new THREE.Euler(), new THREE.Vector3(1, 1, reach));
    parts.push(leg.applyMatrix4(new THREE.Matrix4().makeRotationY(angle)));
  }
  return merged(parts);
}

/** The dimples each foot presses in the surface film, as one flat shape. */
export function striderDimpleGeometry() {
  const parts = STRIDER_LEGS.map(([angle, reach]) =>
    placed(new THREE.RingGeometry(0.6, 1, 16), new THREE.Vector3(0, 0, reach), new THREE.Euler(-Math.PI / 2, 0, 0), new THREE.Vector3().setScalar(0.012)).applyMatrix4(
      new THREE.Matrix4().makeRotationY(angle),
    ),
  );
  return merged(parts);
}

function merged(parts: THREE.BufferGeometry[]) {
  const shape = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)));
  parts.forEach((part) => part.dispose());
  if (!shape) throw new Error("strider shape");
  return shape;
}
