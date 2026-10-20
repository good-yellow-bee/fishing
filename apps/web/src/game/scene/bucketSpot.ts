import { footHeight, inLake } from "@stillwater/shared";

/**
 * Where the bait bucket (GT429) stands while the angler stands still: at their feet, a little ahead and to their
 * right, where the camera behind them sees it (clear of the dock's thermos, which stands behind them); where that is
 * water, the first of their left, behind-right or behind-left that is deck or bank. Pure.
 */

/** How far to the side, and ahead, of the angler's feet it stands. */
export const BUCKET_SIDE = 0.45;
export const BUCKET_AHEAD = 0.3;

/** The bucket's spot for an angler at (x, z) facing `yaw` (+z at 0). */
export function bucketSpot(x: number, z: number, yaw: number) {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  // Their right, facing (fx, fz) with y up, is (-fz, fx).
  const at = (side: number, ahead: number) => ({ x: x - fz * side + fx * ahead, z: z + fx * side + fz * ahead });
  const dry = ({ x: px, z: pz }: { x: number; z: number }) => !inLake(px, pz) || footHeight(px, pz) > 0;
  const tries = [at(BUCKET_SIDE, BUCKET_AHEAD), at(-BUCKET_SIDE, BUCKET_AHEAD), at(BUCKET_SIDE, -BUCKET_AHEAD), at(-BUCKET_SIDE, -BUCKET_AHEAD)];
  const spot = tries.find(dry) ?? tries[2]!;
  return { ...spot, y: footHeight(spot.x, spot.z) };
}
