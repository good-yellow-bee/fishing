import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, SHOP_X, lakeEdge } from "@stillwater/shared";

/**
 * Where the shiner trap (GT453) lies while it is set: a stake on the bank below the shack, between the
 * boardwalk and the washing line, its cord running out to the wire cage in the shallows. Still.
 */

/** The bank's x below the shack: west of the washing line's posts, which hide the water behind them on a dry day. */
const RIM_X = SHOP_X - 1.2;
const ANGLE = -Math.acos(RIM_X / LAKE_RX);
/** Just inland of the waterline, so the stake stands on the bank. */
const BACK = 0.15;
/** From the stake out to the middle of the cage, toward the lake's middle; the cage lies along the shore. */
export const TRAP_REACH = 0.95;
/** How far west along the shore the cage's middle lies from the stake, so the stake doesn't stand in front of it. */
export const CAGE_ALONG = 0.35;
/** The cage's length and its radius; its top breaks the surface (y 0) so it reads from the shack. */
export const CAGE_LENGTH = 0.6;
export const CAGE_RADIUS = 0.13;
export const CAGE_Y = 0.05 - CAGE_RADIUS;

const edge = lakeEdge(ANGLE);
const x = Math.cos(ANGLE) * (LAKE_RX * edge + BACK);
const z = LAKE_CENTER_Z - Math.sin(ANGLE) * (LAKE_RZ * edge + BACK);
/** The stake; unturned the cage lies out along +z (and along +x) from it, turned toward the lake's middle. */
export const TRAP_STAKE = { x, z, yaw: Math.atan2(-x, LAKE_CENTER_Z - z) };

/** The middle of the cage, out from the stake. */
export function cageAt() {
  const { x, z, yaw } = TRAP_STAKE;
  return { x: x + Math.sin(yaw) * TRAP_REACH + Math.cos(yaw) * CAGE_ALONG, z: z + Math.cos(yaw) * TRAP_REACH - Math.sin(yaw) * CAGE_ALONG };
}

/** Once the trap is ready, a shiner flips at the surface inside the cage now and then: every FLIP_EVERY seconds, for FLIP_SEC. */
export const FLIP_EVERY = 3.2;
export const FLIP_SEC = 0.45;
/** How high a flip throws the shiner above the water, and how far along the cage the three flips land either side of its middle. */
const FLIP_LIFT = 0.07;
const FLIP_ALONG = 0.13;

export type Flip = { lift: number; along: number; roll: number };

/** The flipping shiner at `time` (s): its height above the water, its place along the cage, and its tumble; null between flips. Still, it lies just under the cage's top. */
export function shinerFlip(time: number, still: boolean): Flip | null {
  if (still) return { lift: 0.01, along: 0, roll: 0.25 };
  const into = time % FLIP_EVERY;
  if (into > FLIP_SEC) return null;
  const share = into / FLIP_SEC;
  return { lift: Math.sin(Math.PI * share) * FLIP_LIFT, along: ((Math.floor(time / FLIP_EVERY) % 3) - 1) * FLIP_ALONG, roll: share * Math.PI * 2 };
}
