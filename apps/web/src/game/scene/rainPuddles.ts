import { SHOP_X, SHOP_Z, type LakeSeason } from "@stillwater/shared";

/**
 * Puddles that gather on the grass round the shack while it rains, each pricked by raindrops
 * whose rings spread across it. Pure in time.
 */

export type Puddle = { x: number; z: number; rx: number; rz: number; yaw: number };

/** Low spots in front of the shack where the rain lies, clear of the campfire's stones. */
export const PUDDLES: readonly Puddle[] = [
  { x: SHOP_X - 0.7, z: SHOP_Z - 1.5, rx: 0.5, rz: 0.32, yaw: 0.3 },
  { x: SHOP_X + 1.3, z: SHOP_Z - 2.3, rx: 0.38, rz: 0.26, yaw: -0.5 },
  { x: SHOP_X - 3.3, z: SHOP_Z - 1.5, rx: 0.44, rz: 0.3, yaw: 1.1 },
  { x: SHOP_X + 2.4, z: SHOP_Z - 0.9, rx: 0.34, rz: 0.24, yaw: 0.8 },
];
/** Raindrops falling on each puddle at once, and how long each one's ring takes to spread and fade. */
export const DROPS_PER_PUDDLE = 3;
export const RING_SEC = 0.6;

/** The ground holds water while it rains, but not in winter, when the rain is snow and the ground frozen. */
export function puddlesOut(rain: boolean, season: LakeSeason) {
  return rain && season !== "winter";
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export type PuddleRing = { x: number; z: number; age: number };

/**
 * Drop `i` on puddle `p` at time `t`: each lands at a fresh spot inside the puddle every cycle, its
 * ring spreading from nothing as `age` runs 0..1; between drops `age` is -1.
 */
export function puddleRing(p: number, i: number, t: number): PuddleRing {
  const puddle = PUDDLES[p]!;
  const seed0 = p * 31 + i * 7;
  const period = 0.8 + unit(seed0 + 1) * 0.9;
  const shifted = t / period + unit(seed0 + 5);
  const cycle = Math.floor(shifted);
  const age = ((shifted - cycle) * period) / RING_SEC;
  const seed = seed0 * 97 + cycle * 13;
  // Somewhere inside the inner part of the puddle, so the ring stays on the water.
  const a = unit(seed) * Math.PI * 2;
  const r = Math.sqrt(unit(seed + 3)) * 0.55;
  const lx = Math.cos(a) * r * puddle.rx;
  const lz = Math.sin(a) * r * puddle.rz;
  const cos = Math.cos(puddle.yaw);
  const sin = Math.sin(puddle.yaw);
  return { x: puddle.x + lx * cos + lz * sin, z: puddle.z - lx * sin + lz * cos, age: age <= 1 ? age : -1 };
}
