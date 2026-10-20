import * as THREE from "three";
import type { Moth } from "./mothOrbit";

export const MOTH_COLOR = "#f3e6c8";
/** Drawn larger than life so they read from the camera. */
export const MOTH_SIZE = 0.08;

/** Two wings as a bow tie in the xz plane, hinged along the z axis. */
export function mothGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.4, 1, 0, 0.2, 0, 0, 0.5, 0, 0, -0.4, -1, 0, 0.2, 0, 0, 0.5], 3));
  geo.computeVertexNormals();
  return geo;
}

/** Poses `into` as `moth`, heading for where it is `next`, its wings narrowed by the beat (held open when `still`), at `show` of its size. */
export function poseMoth(into: THREE.Object3D, moth: Moth, next: Moth, still: boolean, show = 1) {
  into.position.set(moth.x, moth.y, moth.z);
  into.rotation.set(0, Math.atan2(next.x - moth.x, next.z - moth.z), 0);
  into.scale.set(MOTH_SIZE * show * (0.25 + 0.75 * (still ? 1 : moth.flap)), MOTH_SIZE * show, MOTH_SIZE * show);
  into.updateMatrix();
}
