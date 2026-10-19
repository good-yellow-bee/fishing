import { lureClass, type LakeHour } from "@stillwater/shared";
import { MINNOW_POOL, minnowsOut } from "./scene/minnowSwirl";

/** How far past the lit pool a lure can land and still be among the minnows, in metres. */
export const MINNOW_REACH = 0.3;
/** The hunters cruise the edge of the light picking off minnows, so a minnow-like lure among them bites this much sooner. */
export const LANTERN_MINNOW_WAIT = 0.85;

/** Whether the lure looks like a small fish in the light: a jig, spinner, spoon, crankbait or streamer. */
export function minnowLike(lure: string | undefined) {
  if (lure === undefined || !lure.trim()) return false;
  const kind = lureClass(lure).id;
  return kind === "jig" || kind === "spinner" || kind === "spoon" || kind === "crank" || kind === "streamer";
}

/** Whether a lure landing at (x, z) lands among the minnows milling in the dock lanterns' light, while the scene has them out. */
export function amongLanternMinnows(hour: LakeHour, x: number, z: number) {
  return minnowsOut(hour) && Math.hypot(MINNOW_POOL.x - x, MINNOW_POOL.z - z) <= MINNOW_POOL.r + MINNOW_REACH;
}
