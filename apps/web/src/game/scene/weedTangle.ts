import * as THREE from "three";
import { mergePainted } from "./mergeParts";

const STEMS = 8;

/** The stems a fish has buried itself in (fight.ts weeded): a ring of thin reed blades standing out of the water round it, leaning every way. */
export function weedTangleShape() {
  return mergePainted(
    Array.from({ length: STEMS }, (_, i) => {
      const angle = (i / STEMS) * Math.PI * 2 + (i % 2) * 0.4;
      const out = 0.16 + (i % 3) * 0.06;
      const height = 0.56 + (i % 4) * 0.09;
      const lean = 0.2 + (i % 3) * 0.08;
      return {
        geometry: new THREE.ConeGeometry(0.028, height, 4),
        position: [Math.cos(angle) * out, height / 2 - 0.08, Math.sin(angle) * out] as [number, number, number],
        // Tipped outward, away from the fish in the middle.
        rotation: [Math.sin(angle) * lean, 0, -Math.cos(angle) * lean] as [number, number, number],
        color: i % 2 ? "#5f7f2c" : "#7d9a3a",
      };
    }),
  );
}

export type WeedThrash = { x: number; y: number; z: number };

/** How the stems are thrown about `time` seconds in, as rotations of the whole tangle: quick, uneven whips as the fish twists in them. Reduced motion holds them still. */
export function weedThrash(time: number, still = false): WeedThrash {
  if (still) return { x: 0, y: 0, z: 0 };
  return {
    x: 0.16 * Math.sin(time * 9.2 + 1.3) + 0.05 * Math.sin(time * 15.1),
    y: 0.25 * Math.sin(time * 3.1),
    z: 0.2 * Math.sin(time * 11) + 0.08 * Math.sin(time * 17.3),
  };
}
