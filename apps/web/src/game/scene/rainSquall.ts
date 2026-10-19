import { inLake, type LakeSeason } from "@stillwater/shared";

/**
 * A squall: now and then in a shower a heavier band of rain sweeps across the far half of the
 * lake, a grey curtain of falling streaks with the water boiling with rings beneath it, passing
 * from one side of the view to the other. Pure in time.
 */

/** In rain from spring to fall; winter's showers fall as snow. */
export function squallOut(rain: boolean, season: LakeSeason) {
  return rain && season !== "winter";
}

/** A squall crosses this often, taking CROSS_SEC to pass from one side to the other. */
export const SQUALL_EVERY_SEC = 80;
export const CROSS_SEC = 34;
const FIRST_SEC = 10;
/** Where it runs: across the lake at SQUALL_Z, from x = -RUN to RUN, the curtain WIDTH wide and DEPTH deep. */
export const SQUALL_Z = -8.5;
const RUN = 28;
export const WIDTH = 9;
export const DEPTH = 4;
export const TALL = 6;
/** Rings boiling under it at once, and how long each spreads. */
export const SQUALL_RINGS = 46;
const RING_SEC = 0.55;

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

export type Squall = { index: number; x: number; z: number; fade: number };

/** The squall crossing at `time`: the middle of its curtain and how thick it is, 0 to 1; null between squalls. `still` shows none. */
export function squallAt(time: number, still = false): Squall | null {
  if (still) return null;
  const shifted = time - FIRST_SEC;
  const index = Math.floor(shifted / SQUALL_EVERY_SEC);
  const since = shifted - index * SQUALL_EVERY_SEC;
  if (since >= CROSS_SEC) return null;
  const k = since / CROSS_SEC;
  // Every other one blows the other way.
  const way = index % 2 === 0 ? 1 : -1;
  return { index, x: way * (-RUN + 2 * RUN * k), z: SQUALL_Z, fade: smooth(k / 0.2) * smooth((1 - k) / 0.2) };
}

export type SquallRing = { x: number; z: number; radius: number; fade: number };

/** Ring `i` boiling up under the squall at `time`; null when there is none or it would fall on land. */
export function squallRing(i: number, time: number, still = false): SquallRing | null {
  const squall = squallAt(time, still);
  if (!squall) return null;
  const period = RING_SEC * (1 + hash(i) * 0.6);
  const offset = hash(i + 0.5) * period;
  const cycle = Math.floor((time + offset) / period);
  const k = (time + offset - cycle * period) / period;
  const seed = i * 53 + cycle * 7;
  // Thickest under the middle of the curtain.
  const across = (hash(seed) + hash(seed + 1) - 1) * WIDTH * 0.5;
  const x = squall.x + across;
  const z = squall.z + (hash(seed + 2) - 0.5) * DEPTH;
  if (!inLake(x, z)) return null;
  return { x, z, radius: 0.05 + 0.3 * k, fade: (1 - k) * squall.fade };
}
