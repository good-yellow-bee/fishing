import * as THREE from "three";
import { mergePainted } from "./mergeParts";

/** A ball of duckweed caught on the line (GT391): a few flattened green lumps, wider than tall, riding the water. */
export function weedClumpShape() {
  const lumps: [number, number, number, number][] = [
    [0, 0, 0, 0.16],
    [0.12, 0.01, 0.05, 0.1],
    [-0.1, 0.01, -0.06, 0.11],
    [0.03, 0.02, -0.12, 0.09],
    [-0.05, 0.03, 0.1, 0.08],
  ];
  return mergePainted(
    lumps.map(([x, y, z, r], i) => ({
      geometry: new THREE.IcosahedronGeometry(r, 0),
      position: [x, y, z],
      scale: [1, 0.45, 1],
      rotation: [0, i * 1.3, 0],
      color: i % 2 ? "#6f9a36" : "#86b244",
    })),
  );
}
