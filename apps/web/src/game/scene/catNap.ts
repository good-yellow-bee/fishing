import { SHOP_X, SHOP_Z, type LakeHour, type Sky } from "@stillwater/shared";
import { FIRE_AT, campfireLit } from "./campfireSmoke";

/**
 * The shack's cat. By day it naps curled up on the grass in front of the shack, now and then
 * lifting its head to look round; while the campfire burns it sits up beside it, facing the
 * flames. It keeps indoors in the rain. Pure in time.
 */

/** Where it naps by day, on the grass beside the seat log on the shack's east side. */
export const NAP_AT = { x: SHOP_X + 1.85, z: SHOP_Z - 0.45 };
/** Where it sits by the fire, on the side away from the shack, a little way back from the stones, and which way it faces: at the flames. */
export const FIRESIDE_AT = { x: FIRE_AT.x - 0.6, z: FIRE_AT.z + 0.4 };
export const FIRESIDE_YAW = Math.atan2(FIRE_AT.x - FIRESIDE_AT.x, FIRE_AT.z - FIRESIDE_AT.z);
/** Seconds between the times it lifts its head from a nap, and how long it keeps it up. */
export const LOOK_EVERY_SEC = 17;
const LOOK_SEC = 3.5;

export type CatPlace = "nap" | "fireside";

/** Where the cat is: napping by day, by the fire when it is lit, and nowhere in the rain. */
export function catPlace(hour: LakeHour, sky: Sky | undefined): CatPlace | null {
  if (sky === "rain") return null;
  return campfireLit(hour, sky) ? "fireside" : "nap";
}

function smoothstep(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

/**
 * How the cat moves `time` seconds in: how far its head is raised from the nap (0 down, 1 up),
 * which way the raised head turns, and the flick of its tail tip.
 */
export function catAt(time: number, still = false) {
  if (still) return { look: 0, turn: 0, flick: 0 };
  const into = ((time % LOOK_EVERY_SEC) + LOOK_EVERY_SEC) % LOOK_EVERY_SEC;
  const look = into < LOOK_SEC ? smoothstep(into / 0.5) * smoothstep((LOOK_SEC - into) / 0.5) : 0;
  const turn = Math.sin((time / LOOK_EVERY_SEC) * 2.3) * 0.6 * look;
  // The tip twitches in short bursts, as a dozing cat's does.
  const burst = Math.max(0, Math.sin(time * 0.7));
  const flick = Math.sin(time * 9) * burst * burst * 0.5;
  return { look, turn, flick };
}
