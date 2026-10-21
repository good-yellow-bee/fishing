import { SHOP_X, SHOP_Z, type LakeSeason } from "@stillwater/shared";

/**
 * The shack's worm bin (GT466 sells worms): an open crate of soil by the deck, a few worms poking up out of it,
 * each slowly rising and sinking back and swaying as it leans; in winter they keep down under snow. Pure.
 */

/** Where the bin stands, on the grass platform just off the front of the shack's deck, at the angler's left toward the camera; y is the platform's top. */
export const BIN_AT = { x: SHOP_X - 0.25, y: 0.07, z: SHOP_Z + 0.55 };
/** The crate's inside, across (x) and front to back (z), and how far its walls stand off its middle. */
export const BIN_INSIDE = { width: 0.4, depth: 0.3 };
export const BIN_HALF = 0.23;
/** The crate's wall height and thickness. */
export const BIN_HEIGHT = 0.18;
export const BIN_WALL = 0.025;
/** How far each worm's lean swings, in radians, the least and most of it that shows above the soil, and the farthest its tip reaches from its root. */
export const WORM_LEAN = 0.35;
export const RISE_MIN = 0.45;
export const RISE_MAX = 1;
export const WORM_REACH = 0.105;

/** Where each worm comes up, as a share of the inside from its middle. */
const SPOTS = [
  { x: -0.22, z: 0.13 },
  { x: 0.03, z: -0.14 },
  { x: 0.22, z: 0.1 },
  { x: -0.04, z: 0.14 },
];

export const BIN_WORMS = SPOTS.length;

export type BinWorm = { x: number; z: number; yaw: number; lean: number; rise: number };

/** Worms show over the soil except in winter, when snow lies on it. */
export function binSnowy(season: LakeSeason) {
  return season === "winter";
}

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
