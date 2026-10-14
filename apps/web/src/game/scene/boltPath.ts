import { skyPointReflection } from "./starField";

/**
 * A lightning bolt over the far shore: a jagged line from the cloud base down
 * behind the hills. The dock looks down at the lake more than up at the sky,
 * so each bolt also shows upside down in the water's mirror.
 */
export const BOLT_POINTS = 10;
/** Where it leaves the cloud and where the hills hide it, meters up. */
export const BOLT_TOP = 40;
export const BOLT_BOTTOM = 4;
/** How far off over the far shore, and how far either side. */
const BOLT_Z = -100;
const BOLT_SPAN_X = 40;
/** Side-to-side zigzag of each step. */
const JAG = 3.2;

export type BoltPoint = readonly [number, number, number];

function unit(seed: number, salt: number) {
  const s = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** The bolt for a strike's `seed`, top to bottom. */
export function boltPath(seed: number): BoltPoint[] {
  const points: BoltPoint[] = [];
  let x = (unit(seed, 1) * 2 - 1) * BOLT_SPAN_X;
  let z = BOLT_Z + (unit(seed, 2) * 2 - 1) * 10;
  for (let i = 0; i < BOLT_POINTS; i += 1) {
    const y = BOLT_TOP - ((BOLT_TOP - BOLT_BOTTOM) * i) / (BOLT_POINTS - 1);
    if (i > 0) {
      x += (unit(seed, 10 + i) * 2 - 1) * JAG;
      z += (unit(seed, 30 + i) * 2 - 1) * JAG * 0.5;
    }
    points.push([x, y, z]);
  }
  return points;
}

/** The bolt's image in the lake from `eye`: the run of points whose reflection lands on the water, top of the bolt first. */
export function boltMirror(path: readonly BoltPoint[], eye: { x: number; y: number; z: number }): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (const point of path) {
    const at = skyPointReflection(point, eye);
    if (!at) {
      if (out.length > 0) break;
      continue;
    }
    out.push(at);
  }
  return out;
}
