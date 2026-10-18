import * as THREE from "three";
import { mergePainted } from "./mergeParts";

/** Downy yellow-brown ducklings with darker caps. */
const DUCKLING_DOWN = "#d9b45a";
const DUCKLING_HEAD = "#7a5a2e";

/** A duck's body, head and bill bake into one shape in its own colours. */
export function duckShape(body: string, head: string) {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 12, 9), position: [0, 0.09, 0], scale: [0.19, 0.15, 0.3], color: body },
    // A short tail cocked up behind, which is all that shows when it up-ends to feed.
    { geometry: new THREE.ConeGeometry(0.06, 0.14, 6), position: [0, 0.14, -0.3], rotation: [-Math.PI / 2 + 0.5, 0, 0], color: body },
    { geometry: new THREE.SphereGeometry(1, 10, 8), position: [0, 0.26, 0.2], scale: 0.1, color: head },
    { geometry: new THREE.ConeGeometry(0.035, 0.09, 6), position: [0, 0.25, 0.32], rotation: [Math.PI / 2, 0, 0], color: "#d8a13c" },
  ]);
}

/** A duckling's down, head and bill bake into one shape. */
export function ducklingShape() {
  return mergePainted([
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.05, 0], scale: [0.08, 0.065, 0.11], color: DUCKLING_DOWN },
    { geometry: new THREE.SphereGeometry(1, 8, 6), position: [0, 0.12, 0.08], scale: 0.05, color: DUCKLING_HEAD },
    { geometry: new THREE.ConeGeometry(0.018, 0.04, 5), position: [0, 0.115, 0.135], rotation: [Math.PI / 2, 0, 0], color: "#c98f32" },
  ]);
}
