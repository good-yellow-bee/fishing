import { lureClass, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { LEAN, MIDGE_CLOUDS, midgesOut, SPREAD } from "./scene/midgeDance";

/** How far past a midge cloud's spread a fly can land and still be under it, in metres. */
export const MIDGE_REACH = 0.4;
/** The fish rise to the midges that fall to the water, so a dry fly under a cloud bites this much sooner. */
export const MIDGE_RISE_WAIT = 0.85;

/** Whether the lure is a dry fly, small enough to pass for a midge on the film. */
export function midgeLike(lure: string | undefined) {
  if (lure === undefined || !lure.trim()) return false;
  return lureClass(lure).id === "fly";
}

/** Whether a lure landing at (x, z) lands under one of the midge clouds dancing over the water, while the scene has them out, leaning with the wind as drawn. */
export function underMidges(hour: LakeHour, sky: Sky | undefined, season: LakeSeason | undefined, wind: { x: number; z: number } | undefined, x: number, z: number) {
  if (!season) return false;
  const drift = wind ?? { x: 0, z: 0 };
  if (!midgesOut(hour, sky, season, drift)) return false;
  return MIDGE_CLOUDS.some((cloud) => Math.hypot(cloud.x + drift.x * LEAN - x, cloud.z + drift.z * LEAN - z) <= SPREAD + MIDGE_REACH);
}
