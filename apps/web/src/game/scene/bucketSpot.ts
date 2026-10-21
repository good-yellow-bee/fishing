import { footHeight, inLake, walkableAt, type SpotId } from "@stillwater/shared";
import { BIN_AT, BIN_HALF } from "./binWorms";
import { stakeAt } from "./stakeSpot";
import { CUP_SPOT, THERMOS_SPOT } from "./steamWisp";

/**
 * Where the bait bucket (GT429) stands while the angler stands still: at their feet, a little ahead and to their
 * right, where the camera behind them sees it (clear of the dock's thermos, which stands behind them); where that is
 * water, the first of their left, behind-right or behind-left that is deck, boards or bank. None where all four are
 * water, as on the narrow walk out to the dock, and never in the shack's worm bin. The worm tin (GT465) stands the same way, out to their right just
 * behind their feet, where their body doesn't hide it, never where the bucket, the thermos, a night line's stake or the worm bin is. Pure.
 */

/** How far to the side, and ahead, of the angler's feet it stands. */
export const BUCKET_SIDE = 0.45;
export const BUCKET_AHEAD = 0.3;
/** The worm tin stands further out to the side, and a little behind. */
export const TIN_SIDE = 0.55;
export const TIN_BEHIND = 0.05;
/** How near the bucket, the thermos and its cup, or a stake the tin may not stand; further by a spot's `r` from anything wider. */
const TIN_CLEAR = 0.25;

type Spot = { x: number; z: number; r?: number };

/** The shack's worm bin, as wide as its crate. */
const BIN: Spot = { x: BIN_AT.x, z: BIN_AT.z, r: BIN_HALF };
/** Where things stand for good: the thermos and its cup, the worm bin, and the night line's stake at each bank, whether or not a line is out. */
const FIXED: readonly Spot[] = [THERMOS_SPOT, CUP_SPOT, BIN, ...(["dock", "point", "reeds", "dropoff", "inlet"] as SpotId[]).flatMap((bank) => stakeAt(bank) ?? [])];

/** The first of `tries` (each [right, ahead] of the angler's feet) that is dry and clear of everything `taken`, at its foot height. */
function firstDry(x: number, z: number, yaw: number, tries: readonly (readonly [number, number])[], taken: readonly Spot[] = []) {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  for (const [side, ahead] of tries) {
    // Their right, facing (fx, fz) with y up, is (-fz, fx).
    const px = x - fz * side + fx * ahead;
    const pz = z + fx * side + fz * ahead;
    const dry = !inLake(px, pz) || walkableAt(px, pz);
    if (dry && taken.every((spot) => Math.hypot(px - spot.x, pz - spot.z) >= TIN_CLEAR + (spot.r ?? 0))) return { x: px, y: footHeight(px, pz), z: pz };
  }
  return null;
}

/** The bucket's spot for an angler at (x, z) facing `yaw` (+z at 0), or null where it has nowhere dry to stand. */
export function bucketSpot(x: number, z: number, yaw: number) {
  return firstDry(x, z, yaw, [
    [BUCKET_SIDE, BUCKET_AHEAD],
    [-BUCKET_SIDE, BUCKET_AHEAD],
    [BUCKET_SIDE, -BUCKET_AHEAD],
    [-BUCKET_SIDE, -BUCKET_AHEAD],
  ], [BIN]);
}

/** The worm tin's spot: right, else left, then the same a step further back, never where the bucket, thermos or a stake stands. */
export function tinSpot(x: number, z: number, yaw: number) {
  const bucket = bucketSpot(x, z, yaw);
  return firstDry(
    x,
    z,
    yaw,
    [
      [TIN_SIDE, -TIN_BEHIND],
      [-TIN_SIDE, -TIN_BEHIND],
      [TIN_SIDE, -TIN_BEHIND - 0.4],
      [-TIN_SIDE, -TIN_BEHIND - 0.4],
    ],
    [...FIXED, ...(bucket ? [bucket] : [])],
  );
}
