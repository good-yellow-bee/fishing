import { SHOP_X, SHOP_Z, type LakeSeason } from "@stillwater/shared";

/**
 * A tyre swing hung on a rope from the oak west of the shack. Nobody is on it; it rocks
 * gently on its rope, further in a stronger wind, and in winter wears a cap of snow. Pure in time.
 */

/** Where the rope is tied, high in the oak's crown on the side toward the campfire, and where the tyre hangs below it. */
export const SWING_AT = { x: SHOP_X - 2.2, z: SHOP_Z + 1.3 };
export const ROPE_TOP = 2.7;
/** How high the bottom of the tyre hangs off the grass. */
export const TYRE_LOW = 0.35;
export const TYRE_R = 0.3;
/** The rope's length, from the knot to the tyre's top. */
export const ROPE_LENGTH = ROPE_TOP - TYRE_LOW - TYRE_R * 2;
/** The drift (m/s) of a full breeze, as the windsock's. */
const FULL_WIND = 0.13;

/** The swing's own period on its rope, as a pendulum's, in seconds. */
export const SWING_SEC = 2 * Math.PI * Math.sqrt((ROPE_LENGTH + TYRE_R) / 9.81);

/** Snow lies on the tyre all winter. */
export function tyreSnowy(season: LakeSeason) {
  return season === "winter";
}

/**
 * How far the swing has rocked from hanging straight down, `time` seconds in, as turns (radians)
 * about x (a positive turn swings the tyre toward -z) and about z (a positive turn swings it toward
 * +x). The wind pushes it out downwind and rocks it on its own beat; on a calm day it barely stirs.
 * `still` holds it hanging.
 */
export function swingAngles(time: number, wind: { x: number; z: number }, still = false) {
  if (still) return { x: 0, z: 0 };
  const speed = Math.hypot(wind.x, wind.z);
  const fill = Math.min(1, speed / FULL_WIND);
  const dirX = speed > 1e-6 ? wind.x / speed : 1;
  const dirZ = speed > 1e-6 ? wind.z / speed : 0;
  // Gusts come and go, so the swing builds up and dies down rather than rocking evenly.
  const gust = 0.6 + 0.4 * Math.sin(time * 0.21) * Math.sin(time * 0.53 + 1);
  const along = Math.sin((time / SWING_SEC) * Math.PI * 2) * (0.03 + 0.2 * fill * gust) + 0.05 * fill;
  // A small sway across the wind, out of step, so it traces a loose ellipse rather than a line.
  const across = Math.sin((time / SWING_SEC) * Math.PI * 2 + 1.3) * 0.02;
  const dx = along * dirX - across * dirZ;
  const dz = along * dirZ + across * dirX;
  return { x: -dz, z: dx };
}
