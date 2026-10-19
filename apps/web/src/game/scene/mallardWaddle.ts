import { DOCK_PLANKS, DOCK_STAND_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { visitAt } from "./visitClock";

/**
 * A mallard drake on the dock on wet days: now and then one flaps up out of the water onto the boards
 * behind the angler, waddles a little way in, stops to preen, turning its head right round to its back,
 * gives itself a shake that throws off the rain, waddles on and flaps down off the far edge. From
 * spring to fall, by day while it rains. Pure in time since it came out.
 */

type Spot = { x: number; z: number };

/** Out by day in the rain, from spring to fall. */
export function mallardOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season !== "winter" && sky === "rain" && hour === "day";
}

/** Its way across the boards, between the angler's heels and the snail's loop. */
export const MALLARD_FROM: Spot = { x: DOCK_PLANKS.minX, z: DOCK_STAND_Z + 0.48 };
export const MALLARD_TO: Spot = { x: DOCK_PLANKS.maxX, z: DOCK_STAND_Z + 0.44 };
export const MALLARD_Y = DOCK_PLANKS.top;
/** Where it comes up from and goes down to, out beside the boards on the water. */
const BESIDE = 0.35;
const WATER_DROP = 0.25;

export const VISIT_EVERY_SEC = 80;
const FIRST_SEC = 8;
const UP_SEC = 0.9;
/** Waddling in to where it stops, and on from there; it stops a little past the middle. */
const IN_SEC = 4.2;
const STOP_AT = 0.55;
const PREEN_SEC = 6;
const SHAKE_SEC = 1.2;
const REST_SEC = 2;
const ON_SEC = 3.6;
const DOWN_SEC = 0.9;
export const VISIT_SEC = UP_SEC + IN_SEC + PREEN_SEC + SHAKE_SEC + REST_SEC + ON_SEC + DOWN_SEC;
/** Its steps, a second. */
const STEP_HZ = 2.6;

export type MallardPose = Spot & {
  here: boolean;
  y: number;
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** Its wings out and beating, 0 folded to 1 flapping. */
  flap: number;
  /** Its waddle, -1 to 1, rocking it from foot to foot as it walks; 0 standing. */
  waddle: number;
  /** Its head turned back over its shoulder to preen, 0 to 1. */
  preen: number;
  /** Its shake, -1 to 1, ruffling it about its length; 0 when still. */
  shake: number;
};

const YAW = Math.atan2(MALLARD_TO.x - MALLARD_FROM.x, MALLARD_TO.z - MALLARD_FROM.z);
const AWAY: MallardPose = { ...MALLARD_FROM, here: false, y: MALLARD_Y - WATER_DROP, yaw: YAW, flap: 0, waddle: 0, preen: 0, shake: 0 };

function along(k: number): Spot {
  return { x: MALLARD_FROM.x + (MALLARD_TO.x - MALLARD_FROM.x) * k, z: MALLARD_FROM.z + (MALLARD_TO.z - MALLARD_FROM.z) * k };
}

function smooth(k: number) {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}

/** The mallard `time` seconds after it came out (so it never appears mid-way). `still` stands it in the middle of the boards. */
export function mallardAt(time: number, still = false): MallardPose {
  const stand = (k: number): MallardPose => ({ ...along(k), here: true, y: MALLARD_Y, yaw: YAW, flap: 0, waddle: 0, preen: 0, shake: 0 });
  if (still) return stand(STOP_AT);
  const { index, into } = visitAt(time, FIRST_SEC, VISIT_EVERY_SEC);
  if (index < 0 || into >= VISIT_SEC) return AWAY;
  let t = into;
  if (t < UP_SEC) {
    // A flapping hop up out of the water onto the edge of the boards.
    const k = smooth(t / UP_SEC);
    return { ...along(0), x: MALLARD_FROM.x - BESIDE * (1 - k), here: true, y: MALLARD_Y - WATER_DROP * (1 - k) + 0.12 * Math.sin(Math.PI * k), yaw: YAW, flap: Math.sin(Math.PI * k), waddle: 0, preen: 0, shake: 0 };
  }
  t -= UP_SEC;
  if (t < IN_SEC) return { ...stand(STOP_AT * (t / IN_SEC)), waddle: Math.sin(t * STEP_HZ * Math.PI) * Math.min(1, t / 0.3, (IN_SEC - t) / 0.3) };
  t -= IN_SEC;
  if (t < PREEN_SEC) {
    // Head round to its back and down into its feathers, a few dabs, and back.
    const turn = Math.min(1, t / 0.6, (PREEN_SEC - t) / 0.6);
    return { ...stand(STOP_AT), preen: turn * (0.85 + 0.15 * Math.sin(t * 7)) };
  }
  t -= PREEN_SEC;
  if (t < SHAKE_SEC) {
    const k = t / SHAKE_SEC;
    return { ...stand(STOP_AT), shake: Math.sin(k * Math.PI * 9) * Math.sin(Math.PI * k), flap: k > 0.3 && k < 0.7 ? 0.4 : 0 };
  }
  t -= SHAKE_SEC;
  if (t < REST_SEC) return stand(STOP_AT);
  t -= REST_SEC;
  if (t < ON_SEC) return { ...stand(STOP_AT + (1 - STOP_AT) * (t / ON_SEC)), waddle: Math.sin(t * STEP_HZ * Math.PI) * Math.min(1, t / 0.3, (ON_SEC - t) / 0.3) };
  t -= ON_SEC;
  // A flap down off the far edge onto the water.
  const k = smooth(t / DOWN_SEC);
  return { ...along(1), x: MALLARD_TO.x + BESIDE * k, here: true, y: MALLARD_Y + 0.08 * Math.sin(Math.PI * k) - WATER_DROP * k, yaw: YAW, flap: Math.sin(Math.PI * k), waddle: 0, preen: 0, shake: 0 };
}
