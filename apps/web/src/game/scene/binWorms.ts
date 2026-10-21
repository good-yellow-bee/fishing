import { SHOP_X, SHOP_Z } from "@stillwater/shared";

/**
 * The shack's worm bin (GT466 sells worms): an open crate of soil on the deck, a few worms poking up out of it,
 * each slowly rising and sinking back and swaying as it leans. Pure.
 */

/** Where the bin stands, on the deck at the angler's front left as they wait by the shack. */
export const BIN_AT = { x: SHOP_X - 0.35, z: SHOP_Z + 0.75 };
/** The crate's inside, across (x) and front to back (z). */
export const BIN_INSIDE = { width: 0.34, depth: 0.22 };
/** How far each worm's lean swings, in radians, and the least and most of it that shows above the soil. */
export const WORM_LEAN = 0.35;
export const RISE_MIN = 0.45;
export const RISE_MAX = 1;

/** Where each worm comes up, as a share of the inside from its middle. */
const SPOTS = [
  { x: -0.3, z: 0.2 },
  { x: 0.05, z: -0.25 },
  { x: 0.32, z: 0.15 },
  { x: -0.05, z: 0.3 },
];

export const BIN_WORMS = SPOTS.length;

export type BinWorm = { x: number; z: number; yaw: number; lean: number; rise: number };

/** Worm `i` (below BIN_WORMS) at `time` in seconds: its spot in the soil, which way it faces, its lean and how far up it is. */
export function binWorm(i: number, time: number): BinWorm {
  const spot = SPOTS[i]!;
  const phase = i * 2.39;
  const rise = 0.5 + 0.5 * Math.sin(time * 0.37 + phase);
  return {
    x: spot.x * BIN_INSIDE.width,
    z: spot.z * BIN_INSIDE.depth,
    yaw: phase + Math.sin(time * 0.29 + phase) * 0.6,
    lean: Math.sin(time * 0.8 + phase) * WORM_LEAN,
    rise: RISE_MIN + (RISE_MAX - RISE_MIN) * rise,
  };
}
