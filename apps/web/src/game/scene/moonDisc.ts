import * as THREE from "three";
import { moonSpan } from "@stillwater/shared";

/** The unlit side still shows faintly against the night, as earthshine. */
const EARTHSHINE = 0.1;

/**
 * Alpha for each pixel of a square moon image: the lit part opaque, the dark side faint, outside the disc clear.
 * Rows run top to bottom; returned as one value per pixel so it can be tested without a canvas.
 */
export function moonAlpha(phase: number, size: number): Float32Array {
  const alpha = new Float32Array(size * size);
  for (let row = 0; row < size; row += 1) {
    const y = 1 - ((row + 0.5) / size) * 2;
    const [left, right] = moonSpan(phase, y);
    for (let col = 0; col < size; col += 1) {
      const x = ((col + 0.5) / size) * 2 - 1;
      if (x * x + y * y > 1) continue;
      alpha[row * size + col] = x >= left && x <= right ? 1 : EARTHSHINE;
    }
  }
  return alpha;
}

/** The phase as a white texture for the night disc; the material's color tints it. */
export function moonTexture(phase: number, size = 64): THREE.DataTexture {
  const alpha = moonAlpha(phase, size);
  const data = new Uint8Array(size * size * 4);
  // DataTexture rows start at the bottom, so the image's top row goes in last.
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const from = row * size + col;
      const to = (size - 1 - row) * size + col;
      data.set([255, 255, 255, Math.round(alpha[from]! * 255)], to * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** The moon's road needs at least this much of the moon lit; a thin crescent lays none. */
export const MOON_ROAD_MIN = 0.3;

/**
 * How bright the moon's road of glints on the water is: only on a clear night,
 * brighter the fuller the moon (`light` is moonLight, 0..1). 0 for no road.
 */
export function moonRoad(night: boolean, clear: boolean, light: number): number {
  if (!night || !clear || light < MOON_ROAD_MIN) return 0;
  return Math.min(1, light);
}

export type RoadGlint = { x: number; z: number; scale: number; band: number };

/** Glints in the moon's road, and how many shimmer bands they split into. */
export const MOON_ROAD_GLINTS = 48;
export const MOON_ROAD_BANDS = 3;

function unit(i: number) {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * The glints of the moon's road: a strip from the eye (`from`, on the water plane) toward the
 * moon disc, between `near` and `far` meters out, widening with distance, kept to open water (`onWater`).
 */
export function moonRoadGlints(
  from: { x: number; z: number },
  disc: readonly [number, number, number],
  onWater: (x: number, z: number) => boolean,
  near = 3,
  far = 24,
): RoadGlint[] {
  const dx = disc[0] - from.x;
  const dz = disc[2] - from.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  return Array.from({ length: MOON_ROAD_GLINTS }, (_, i) => {
    const dist = near + (i / (MOON_ROAD_GLINTS - 1)) * (far - near);
    const side = (unit(i + 3) - 0.5) * (0.6 + dist * 0.12);
    return { x: from.x + ux * dist - uz * side, z: from.z + uz * dist + ux * side, scale: 0.4 + unit(i + 17) * 0.6, band: i % MOON_ROAD_BANDS };
  }).filter((glint) => onWater(glint.x, glint.z));
}
