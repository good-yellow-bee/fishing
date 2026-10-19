import type { LakeHour, LakeSeason, Sky } from "@stillwater/shared";

/**
 * A dragonfly on the rod tip: on dry summer days, once the line has sat quiet in the water for a
 * while, a dragonfly comes in over the water and settles on the tip of the rod, wings spread flat,
 * now and then flicking them or turning its head. A nibble, a strike or reeling in sends it off
 * up and away. Pure in the time since the line went quiet and the time since it was disturbed.
 */

/** Out by day in summer, not in the rain. */
export function rodDragonflyOut(hour: LakeHour, sky: Sky | undefined, season: LakeSeason) {
  return hour === "day" && season === "summer" && sky !== "rain";
}

/** Seconds of a quiet line before it comes, and its flight in. */
export const ARRIVE_AFTER_SEC = 9;
export const APPROACH_SEC = 1.6;
/** Its flight off when disturbed. */
export const LEAVE_SEC = 1.5;
/** How often, perched, it flicks its wings, and for how long. */
export const FLICK_EVERY_SEC = 4.5;
const FLICK_SEC = 0.25;
/** Where it comes in from and goes off to, from the rod tip: out over the water ahead and to the side. */
export const COME_FROM = { x: 2.2, y: 0.9, z: -2.6 };
export const GO_TO = { x: -2.4, y: 1.6, z: -2.2 };
/** How far above the tip it sits, on its legs. */
export const PERCH_Y = 0.012;

export type RodDragonflyPose = {
  /** Whether it is about at all. */
  here: boolean;
  /** Offset from the rod tip. */
  x: number;
  y: number;
  z: number;
  /** Which way it faces, as a yaw for a model facing +z. */
  yaw: number;
  /** Its wings buzzing, 0 or 1: blurred in flight and flicks, still and flat at rest. */
  buzz: number;
  /** Its head turning, as a small yaw. */
  look: number;
};

const AWAY: RodDragonflyPose = { here: false, x: COME_FROM.x, y: COME_FROM.y, z: COME_FROM.z, yaw: 0, buzz: 0, look: 0 };
/** Perched side-on across the tip, so its long blue body shows from behind the angler. */
const PERCH_YAW = Math.PI / 2;

function smooth(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * The dragonfly, given how long the line has been quiet (`quiet`, seconds) or, once it was
 * disturbed, how long ago that was (`disturbed`, seconds; null while the line is still quiet).
 * `perchedFor` is how long it had sat before being disturbed, so a fly that never arrived does
 * not fly off. `still` sets it on the tip without flight or flicks.
 */
export function rodDragonflyAt(quiet: number, disturbed: number | null, perchedFor = 0, still = false): RodDragonflyPose {
  if (still) return disturbed === null && quiet >= ARRIVE_AFTER_SEC ? { here: true, x: 0, y: PERCH_Y, z: 0, yaw: PERCH_YAW, buzz: 0, look: 0 } : AWAY;
  if (disturbed !== null) {
    // It only leaves if it had landed or was coming in.
    if (perchedFor <= 0 || disturbed >= LEAVE_SEC) return AWAY;
    const from = rodDragonflyAt(ARRIVE_AFTER_SEC + perchedFor, null);
    const k = smooth(disturbed / LEAVE_SEC);
    // Straight up off the tip first, then away over the water.
    const lift = 0.15 * Math.min(1, disturbed / 0.25) * (1 - k);
    return {
      here: true,
      x: from.x + (GO_TO.x - from.x) * k,
      y: from.y + lift + (GO_TO.y - from.y) * k,
      z: from.z + (GO_TO.z - from.z) * k,
      yaw: Math.atan2(GO_TO.x, GO_TO.z),
      buzz: 1,
      look: 0,
    };
  }
  const t = quiet - ARRIVE_AFTER_SEC;
  if (t < 0) return AWAY;
  if (t < APPROACH_SEC) {
    const k = smooth(t / APPROACH_SEC);
    // In on a shallow dip, hovering a moment just off the tip before it drops on.
    const off = 1 - k;
    return {
      here: true,
      x: COME_FROM.x * off,
      y: PERCH_Y + COME_FROM.y * off * off + 0.04 * Math.sin(Math.PI * k),
      z: COME_FROM.z * off,
      yaw: k > 0.85 ? PERCH_YAW : Math.atan2(-COME_FROM.x, -COME_FROM.z),
      buzz: 1,
      look: 0,
    };
  }
  const sat = t - APPROACH_SEC;
  const into = sat % FLICK_EVERY_SEC;
  const flicking = sat > FLICK_EVERY_SEC / 2 && into < FLICK_SEC;
  // Every other flick it also turns its head to one side and back.
  const round = Math.floor(sat / FLICK_EVERY_SEC);
  const look = round % 2 === 1 ? 0.5 * Math.sin(Math.PI * Math.min(1, into / 1.4)) * (round % 4 === 1 ? 1 : -1) : 0;
  return { here: true, x: 0, y: PERCH_Y, z: 0, yaw: PERCH_YAW, buzz: flicking ? 1 : 0, look };
}

/** How long it had been perched (or coming in) after `quiet` seconds of a quiet line. */
export function perchedAfter(quiet: number) {
  return Math.max(0, quiet - ARRIVE_AFTER_SEC);
}
