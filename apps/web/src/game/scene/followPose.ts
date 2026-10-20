/**
 * A pike following the lure to the bank (the figure-eight, useFishingGame): its shadow trails just behind the float,
 * nosing toward the angler and swaying a little, and when it turns it swings round the float and away. Pure in time.
 */

/** How far behind the float the shadow's middle trails, how wide it sways, and how long its turn takes. */
export const TRAIL = 0.75;
const SWAY = 0.12;
export const TURN_SEC = 0.6;
/** It follows in from a little to one side, so the angler (and the camera behind them) sees its length, not its nose. */
export const FOLLOW_ANGLE = 0.7;

export type FollowPose = { dx: number; dz: number; heading: number };

/**
 * The shadow's offset from the float and its heading (about the vertical, +z at 0) at `time`; `toAngler` is the
 * unit direction from the float to the angler on the water; `turnedFor` is how long it has been turning, or null.
 */
export function followPose(time: number, toAngler: { x: number; z: number }, turnedFor: number | null): FollowPose {
  // Swung round the float from behind it (0) to the angler's side and past, heading back out (pi).
  const swing = turnedFor === null ? 0 : Math.PI * Math.min(1, turnedFor / TURN_SEC);
  const sway = turnedFor === null ? Math.sin(time * 2.2) * SWAY : 0;
  // Behind the float is away from the angler, turned a little to one side; sideways is that turned a quarter.
  const ca = Math.cos(FOLLOW_ANGLE);
  const sa = Math.sin(FOLLOW_ANGLE);
  const back = { x: -toAngler.x * ca + toAngler.z * sa, z: -toAngler.z * ca - toAngler.x * sa };
  const side = { x: -back.z, z: back.x };
  const c = Math.cos(swing);
  const s = Math.sin(swing);
  const dx = (back.x * c + side.x * s) * TRAIL + side.x * sway;
  const dz = (back.z * c + side.z * s) * TRAIL + side.z * sway;
  // Nose toward the float's far side from its middle, so it points at the lure while following and away once turned.
  return { dx, dz, heading: Math.atan2(-dx, -dz) };
}
