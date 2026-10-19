import { LAKE_CENTER_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { CROWN_RADIUS, TREE_TALL } from "./mirrorImage";

/**
 * Snow slipping off the trees: on winter days the snow-laden crowns across the lake now and then let
 * a load go. A few lumps tumble from the crown's lakeward side to the ground, and a puff of powder
 * bursts out and drifts off downwind, glittering as it thins. Pure in time.
 */

type Point = { x: number; y: number; z: number };
type Tree = { position: readonly [number, number, number]; scale: number };

/** A load comes off some tree this often. */
export const SHED_EVERY_SEC = 8;
/** Lumps in each load, and how long the powder hangs in the air. */
export const LUMPS = 5;
export const POWDER = 26;
export const POWDER_SEC = 2.6;
const GRAVITY = 9.8;
/** How far the powder spreads, and how far the breeze carries it over its life. */
const POWDER_SPREAD = 1.3;
const POWDER_CARRY = 40;
/** Only trees across the lake from the dock: the near ones stand behind the camera. */
const FARTHER_THAN_Z = LAKE_CENTER_Z - 2;

/** In winter at dawn and by day, while it is not foggy; falling snow only adds to the load. */
export function snowShedOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season === "winter" && (hour === "dawn" || hour === "day") && sky !== "fog";
}

/** The trees that can shed: the ones across the water. */
export function shedTrees<T extends Tree>(trees: readonly T[]): T[] {
  return trees.filter((tree) => tree.position[2] < FARTHER_THAN_Z);
}

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Where a tree's load lets go: low on its crown, on the side facing the middle of the lake. */
export function shedPoint(tree: Tree): Point {
  const [x, , z] = tree.position;
  const dx = -x;
  const dz = LAKE_CENTER_Z - z;
  const d = Math.hypot(dx, dz) || 1;
  const out = CROWN_RADIUS * tree.scale * 0.85;
  return { x: x + (dx / d) * out, y: TREE_TALL * tree.scale * 0.68, z: z + (dz / d) * out };
}

export type Shed = { tree: number; from: Point; age: number };

/** The load coming off at `time`: which tree, where from and how long ago it let go. */
export function shedAt(time: number, trees: readonly Tree[]): Shed | null {
  if (trees.length === 0) return null;
  const round = Math.floor(time / SHED_EVERY_SEC);
  const tree = Math.floor(hash(round + 0.17) * trees.length) % trees.length;
  return { tree, from: shedPoint(trees[tree]!), age: time - round * SHED_EVERY_SEC };
}

/** Lump `k` of a load `age` seconds after it let go, or null once it has hit the ground. */
export function lumpAt(from: Point, k: number, age: number): (Point & { size: number }) | null {
  // Lumps break away one after another, a moment apart.
  const t = age - k * 0.07;
  if (t < 0) return { ...from, size: 0 };
  const y = from.y - 0.5 * GRAVITY * t * t;
  if (y <= 0) return null;
  const a = hash(k + 0.61) * Math.PI * 2;
  const drift = 0.35 * t;
  return { x: from.x + Math.cos(a) * drift, y, z: from.z + Math.sin(a) * drift, size: 0.14 + hash(k + 0.29) * 0.1 };
}

/** Powder grain `k` of a load `age` seconds in, drifting with `wind`; alpha 0 before the burst and once it has thinned away. */
export function powderAt(from: Point, k: number, age: number, wind: { x: number; z: number }): Point & { alpha: number } {
  const p = Math.min(1, Math.max(0, age / POWDER_SEC));
  const a = hash(k + 0.13) * Math.PI * 2;
  const tilt = hash(k + 0.47) * 2 - 1;
  // It bursts out fast, then slows and hangs, sinking a little as the breeze takes it.
  const burst = POWDER_SPREAD * (1 - (1 - p) * (1 - p) * (1 - p)) * (0.4 + hash(k + 0.83) * 0.6);
  const ring = Math.sqrt(1 - tilt * tilt);
  return {
    x: from.x + Math.cos(a) * ring * burst + wind.x * POWDER_CARRY * p,
    y: Math.max(0.05, from.y + tilt * burst * 0.6 - 1.4 * p * p),
    z: from.z + Math.sin(a) * ring * burst + wind.z * POWDER_CARRY * p,
    alpha: age >= POWDER_SEC || age < 0 ? 0 : 0.85 * Math.min(1, age / 0.08) * (1 - p) * (1 - p),
  };
}
