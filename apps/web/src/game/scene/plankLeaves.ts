import type { LakeSeason } from "@stillwater/shared";
import { DOCK_PLANKS } from "@stillwater/shared";

/**
 * Fall leaves on the dock: a few lie on the planks from the start, more settle
 * as the visit goes on, and now and then a puff of wind skitters one across the
 * boards. Pure functions of time, like the leaves on the water.
 */
export const PLANK_LEAF_COUNT = 18;
/** Leaves already down when you arrive. */
export const PLANK_LEAVES_AT_START = 8;
/** Seconds between each later leaf settling. */
export const PLANK_LEAF_EVERY = 20;
/** One leaf skitters each round, for this long. */
export const SKITTER_ROUND_SEC = 9;
export const SKITTER_SEC = 1.4;
/** Stays clear of the rail edge. */
const EDGE = 0.1;
/** Meters a skitter carries a leaf in still air, and how much each meter a second of wind drift adds. */
const CALM_SKITTER = 0.18;
const WIND_SKITTER = 5;
const MAX_SKITTER = 0.6;

export function dockLeavesOut(season: LakeSeason) {
  return season === "fall";
}

function hash(i: number) {
  const s = Math.sin(i * 61.7 + 7.3) * 43758.5453;
  return s - Math.floor(s);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** When leaf `index` settles on the planks, seconds into the visit. */
export function plankLeafArrives(index: number) {
  if (index < PLANK_LEAVES_AT_START) return 0;
  return (index - PLANK_LEAVES_AT_START + hash(index + 100) * 0.8) * PLANK_LEAF_EVERY + PLANK_LEAF_EVERY * 0.5;
}

export type PlankLeaf = {
  x: number;
  z: number;
  /** Meters above the planks; above 0 only mid-skitter. */
  lift: number;
  spin: number;
  color: number;
};

function skitterStep(round: number, wind: { x: number; z: number }) {
  const speed = Math.hypot(wind.x, wind.z);
  const reach = Math.min(MAX_SKITTER, CALM_SKITTER + speed * WIND_SKITTER);
  const jitter = (hash(round + 500) - 0.5) * 1.2;
  const heading = speed > 0.01 ? Math.atan2(wind.z, wind.x) + jitter : hash(round + 900) * Math.PI * 2;
  return { x: Math.cos(heading) * reach, z: Math.sin(heading) * reach };
}

function ease(u: number) {
  const t = clamp(u, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Leaf `index` at `time`, or null before it has settled. */
export function plankLeafAt(index: number, time: number, wind: { x: number; z: number }): PlankLeaf | null {
  if (time < plankLeafArrives(index)) return null;
  const minX = DOCK_PLANKS.minX + EDGE;
  const maxX = DOCK_PLANKS.maxX - EDGE;
  const minZ = DOCK_PLANKS.minZ + EDGE;
  const maxZ = DOCK_PLANKS.maxZ - EDGE;
  let x = minX + hash(index) * (maxX - minX);
  let z = minZ + hash(index + 40) * (maxZ - minZ);
  let spin = hash(index + 80) * Math.PI * 2;
  let lift = 0;
  const now = Math.floor(time / SKITTER_ROUND_SEC);
  for (let round = index; round <= now; round += PLANK_LEAF_COUNT) {
    const start = round * SKITTER_ROUND_SEC;
    if (start < plankLeafArrives(index)) continue;
    const step = skitterStep(round, wind);
    const u = round === now ? (time - start) / SKITTER_SEC : 1;
    const done = ease(u);
    const toX = clamp(x + step.x, minX, maxX);
    const toZ = clamp(z + step.z, minZ, maxZ);
    if (round === now && u < 1) {
      lift = Math.sin(clamp(u, 0, 1) * Math.PI) * 0.06;
      spin += done * (hash(round + 300) - 0.5) * 4;
      x += (toX - x) * done;
      z += (toZ - z) * done;
    } else {
      spin += (hash(round + 300) - 0.5) * 4;
      x = toX;
      z = toZ;
    }
  }
  return { x, z, lift, spin, color: index % 4 };
}
