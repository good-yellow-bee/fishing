import { DOCK_PLANKS, DOCK_STAND_X, DOCK_STAND_Z, type LakeHour, type LakeSeason, type Sky } from "@stillwater/shared";
import { smoothstep, visitAt } from "./visitClock";

/**
 * A mallard drake on the dock on wet days: now and then one swims in to the left side of the dock,
 * flaps up onto the boards behind the angler, waddles in, stops to preen with its head right round to
 * its back, gives itself a shake that throws off the rain, then turns and waddles back, flaps down and
 * swims away. It keeps to the left of the angler, clear of the thermos. A strike from the dock while it
 * is on the boards flushes it: it bursts up off them and away over the lake. From spring to fall, by day
 * while it rains. Pure in time since it came out.
 */

type Spot = { x: number; z: number };

/** Out by day in the rain, from spring to fall. */
export function mallardOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return season !== "winter" && sky === "rain" && hour === "day";
}

/** The edge it climbs up at, and where it stops behind the angler; between the angler's heels and the snail's loop. */
export const MALLARD_EDGE: Spot = { x: DOCK_PLANKS.minX, z: DOCK_STAND_Z + 0.46 };
export const MALLARD_STOP: Spot = { x: DOCK_STAND_X - 0.05, z: DOCK_STAND_Z + 0.44 };
export const MALLARD_Y = DOCK_PLANKS.top;
/** Out on the water: where it lands beside the dock, and where it swims in from and off to. */
const BESIDE = 0.3;
const OUT = 1.3;
const WATER_Y = 0.02;

export const VISIT_EVERY_SEC = 80;
const FIRST_SEC = 8;
const SWIM_SEC = 2.6;
const UP_SEC = 0.9;
const WALK_SEC = 3.4;
const PREEN_SEC = 6;
const SHAKE_SEC = 1.2;
const REST_SEC = 1.4;
const TURN_SEC = 1;
const DOWN_SEC = 0.9;
export const VISIT_SEC = SWIM_SEC + UP_SEC + WALK_SEC + PREEN_SEC + SHAKE_SEC + REST_SEC + TURN_SEC + WALK_SEC + DOWN_SEC + SWIM_SEC;
/** When it is up on the boards, from landing to stepping off, in seconds into a visit. */
const ON_BOARDS = SWIM_SEC + UP_SEC;
const OFF_BOARDS = ON_BOARDS + WALK_SEC + PREEN_SEC + SHAKE_SEC + REST_SEC + TURN_SEC + WALK_SEC;
/** Flushed, it is gone over the lake this fast, rising this high and going this far. */
const FLUSH_SEC = 1.6;
const FLUSH_UP = 1.6;
const FLUSH_OUT = 3;
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

/** Facing in along the boards (toward +x), and back out. */
const IN_YAW = Math.atan2(MALLARD_STOP.x - MALLARD_EDGE.x, MALLARD_STOP.z - MALLARD_EDGE.z);
const OUT_YAW = IN_YAW + Math.PI;
const AWAY: MallardPose = { ...MALLARD_EDGE, x: MALLARD_EDGE.x - OUT, here: false, y: WATER_Y, yaw: IN_YAW, flap: 0, waddle: 0, preen: 0, shake: 0 };

function between(a: Spot, b: Spot, k: number): Spot {
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
}

const sea = (x: number): Spot => ({ x, z: MALLARD_EDGE.z });

/** A gait's rocking, easing in and out over a walk of `length` seconds. */
function rocking(t: number, length: number) {
  return Math.sin(t * STEP_HZ * Math.PI) * Math.min(1, t / 0.3, (length - t) / 0.3);
}

/** Which visit `time` falls in and how far into it, counted from when it came out. */
export const mallardVisit = (time: number) => visitAt(time, FIRST_SEC, VISIT_EVERY_SEC);

/**
 * The mallard `time` seconds after it came out (so it never appears mid-way). `still` stands it behind the
 * angler. `startledAt`, on the same clock, is the angler's last strike: while it is on the boards that
 * flushes it, and if it is still coming in, it goes as soon as it lands.
 */
export function mallardAt(time: number, still = false, startledAt = -Infinity): MallardPose {
  const at = (spot: Spot, yaw: number, y = MALLARD_Y): MallardPose => ({ ...spot, here: true, y, yaw, flap: 0, waddle: 0, preen: 0, shake: 0 });
  if (still) return at(MALLARD_STOP, IN_YAW);
  const { index, into } = mallardVisit(time);
  if (index < 0 || into >= VISIT_SEC) return AWAY;
  const strike = mallardVisit(startledAt);
  const flushAt = strike.index === index && strike.into < OFF_BOARDS ? Math.max(ON_BOARDS, strike.into) : Infinity;
  if (into >= flushAt) {
    const away = into - flushAt;
    if (away >= FLUSH_SEC) return AWAY;
    // Straight up off the boards in a clatter of wings and away out over the lake.
    const from = mallardAt(time - away);
    const k = smoothstep(away / FLUSH_SEC);
    const to = { x: from.x - FLUSH_OUT * 0.6, z: from.z - FLUSH_OUT };
    return { ...between(from, to, k * k), here: true, y: from.y + FLUSH_UP * k, yaw: Math.atan2(to.x - from.x, to.z - from.z), flap: 1, waddle: 0, preen: 0, shake: 0 };
  }
  let t = into;
  const hop = (from: Spot, to: Spot, fromY: number, toY: number, yaw: number, k: number): MallardPose => {
    const e = smoothstep(k);
    return { ...at(between(from, to, e), yaw, fromY + (toY - fromY) * e + 0.12 * Math.sin(Math.PI * k)), flap: Math.sin(Math.PI * k) };
  };
  // Swimming in low across the water, its body bobbing.
  if (t < SWIM_SEC) return at(sea(MALLARD_EDGE.x - OUT + (OUT - BESIDE) * smoothstep(t / SWIM_SEC)), IN_YAW, WATER_Y + 0.01 * Math.sin(t * 3));
  t -= SWIM_SEC;
  if (t < UP_SEC) return hop(sea(MALLARD_EDGE.x - BESIDE), MALLARD_EDGE, WATER_Y, MALLARD_Y, IN_YAW, t / UP_SEC);
  t -= UP_SEC;
  if (t < WALK_SEC) return { ...at(between(MALLARD_EDGE, MALLARD_STOP, t / WALK_SEC), IN_YAW), waddle: rocking(t, WALK_SEC) };
  t -= WALK_SEC;
  if (t < PREEN_SEC) {
    // Head round to its back and down into its feathers, a few dabs, and back.
    const turn = Math.min(1, t / 0.6, (PREEN_SEC - t) / 0.6);
    return { ...at(MALLARD_STOP, IN_YAW), preen: turn * (0.85 + 0.15 * Math.sin(t * 7)) };
  }
  t -= PREEN_SEC;
  if (t < SHAKE_SEC) {
    const k = t / SHAKE_SEC;
    // A ruffle about its length, and a quick flick of the wings in the middle of it.
    return { ...at(MALLARD_STOP, IN_YAW), shake: Math.sin(k * Math.PI * 9) * Math.sin(Math.PI * k), flap: 0.4 * Math.sin(Math.PI * smoothstep((k - 0.3) / 0.4)) };
  }
  t -= SHAKE_SEC;
  if (t < REST_SEC) return at(MALLARD_STOP, IN_YAW);
  t -= REST_SEC;
  if (t < TURN_SEC) return { ...at(MALLARD_STOP, IN_YAW + Math.PI * smoothstep(t / TURN_SEC)), waddle: rocking(t, TURN_SEC) * 0.5 };
  t -= TURN_SEC;
  if (t < WALK_SEC) return { ...at(between(MALLARD_STOP, MALLARD_EDGE, t / WALK_SEC), OUT_YAW), waddle: rocking(t, WALK_SEC) };
  t -= WALK_SEC;
  if (t < DOWN_SEC) return hop(MALLARD_EDGE, sea(MALLARD_EDGE.x - BESIDE), MALLARD_Y, WATER_Y, OUT_YAW, t / DOWN_SEC);
  t -= DOWN_SEC;
  return at(sea(MALLARD_EDGE.x - BESIDE - (OUT - BESIDE) * smoothstep(t / SWIM_SEC)), OUT_YAW, WATER_Y + 0.01 * Math.sin(t * 3));
}
