import { hillFront } from "./farHills";

/**
 * Windmill: an old tower mill stands on the skyline of the hills behind the far bank, above the
 * eastern hay field. Its four sails turn with the day's wind, faster as it freshens, and stand
 * still on a calm day. Pure in time.
 */

/** Where the mill stands on the hills' face: its x and the height of its ground, above the eastern field and the sled run. */
export const MILL_AT = { x: 6.9, y: 3.95 };
/** The mill is drawn at this scale. */
export const MILL_SCALE = 1.1;
/** The tower's height to the top of its cap, before scaling: the hub sits on the cap's front. */
export const TOWER_HEIGHT = 1.2;
/** The sails' hub, from the mill's ground, before scaling: out in front of the cap. */
export const HUB = { y: 1.1, z: 0.34 };
/** A sail's reach from the hub, before scaling. */
export const SAIL_REACH = 0.78;

/** The strongest wind's drift (m/s), as for the windsock; below CALM the sails stand still. */
const FULL_WIND = 0.13;
const CALM = 0.015;
/** The sails' turn, radians a second, in a full wind. */
const FULL_SPIN = 1.1;
/** At rest the sails stand in a tilted cross, as a miller leaves them. */
export const PARKED = Math.PI / 4;

/** The mill's ground on the hills' face: out in front of the face as far up as its sail tips reach. */
export function millPoint() {
  const { x, y } = MILL_AT;
  let face = -30;
  for (let up = 0; up <= (HUB.y + SAIL_REACH) * MILL_SCALE; up += 0.1) face = Math.max(face, hillFront(x, y + up) ?? -30);
  return { x, y, z: face + 0.12 };
}

/** How fast the sails turn in the day's wind, radians a second: none when calm. */
export function sailSpin(wind: { x: number; z: number }) {
  const speed = Math.hypot(wind.x, wind.z);
  if (speed < CALM) return 0;
  return FULL_SPIN * Math.min(1, (speed - CALM) / (FULL_WIND - CALM) * 0.8 + 0.2);
}

/** The sails' turn about the hub at `time`, counter-clockwise as the viewer sees them. `still` parks them. */
export function sailAngle(time: number, wind: { x: number; z: number }, still = false) {
  if (still) return PARKED;
  return PARKED + sailSpin(wind) * time;
}
