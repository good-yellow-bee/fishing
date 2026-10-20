import { LAKE_RX, SHOP_X } from "@stillwater/shared";
import { bankStake } from "./stakeSpot";

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
/** The cage's length and its radius; it lies half out of the shallow water (y 0) so it reads from the shack. */
export const CAGE_LENGTH = 0.6;
export const CAGE_RADIUS = 0.13;
export const CAGE_Y = 0.1 - CAGE_RADIUS;

/** The stake; unturned the cage lies out along +z (and along +x) from it, turned toward the lake's middle. */
export const TRAP_STAKE = bankStake(ANGLE, BACK);

/** The middle of the cage, out from the stake. */
export function cageAt() {
  const { x, z, yaw } = TRAP_STAKE;
  return { x: x + Math.sin(yaw) * TRAP_REACH + Math.cos(yaw) * CAGE_ALONG, z: z + Math.cos(yaw) * TRAP_REACH - Math.sin(yaw) * CAGE_ALONG };
}

/** Once the trap is ready, a shiner flips at the surface inside the cage now and then: every FLIP_EVERY seconds, for FLIP_SEC. */
export const FLIP_EVERY = 3.2;
export const FLIP_SEC = 0.45;
/** The shiner's half height; it rests just under the surface and a flip throws it up toward the cage's top, never through it. */
export const SHINER_HALF = 0.016;
const REST_Y = -0.01;
const FLIP_LIFT = 0.08;
/** How far along the cage the three flips land either side of its middle, clear of the funnels. */
const FLIP_ALONG = 0.13;

export type Flip = { y: number; along: number; roll: number };

/** The flipping shiner at `time` (s): its height, its place along the cage, and its tumble; null between flips. Still, it lies at the surface. */
export function shinerFlip(time: number, still: boolean): Flip | null {
  if (still) return { y: 0.03, along: 0, roll: 0.25 };
  const into = time % FLIP_EVERY;
  if (into > FLIP_SEC) return null;
  const share = into / FLIP_SEC;
  return { y: REST_Y + Math.sin(Math.PI * share) * FLIP_LIFT, along: ((Math.floor(time / FLIP_EVERY) % 3) - 1) * FLIP_ALONG, roll: share * Math.PI * 2 };
}
